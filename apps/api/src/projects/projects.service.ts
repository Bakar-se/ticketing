import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './projects.schemas.js';
import { toDate } from '../common/date.js';

type Counts = {
  backlog: number;
  todo: number;
  inProgress: number;
  done: number;
};

// ADAPT: the keys on the left must match your ticket status enum values exactly
const STATUS_KEY: Record<string, keyof Counts> = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  DONE: 'done',
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateProjectInput) {
    // Keys are globally unique in this app. (A multi-tenant product would scope them per workspace.)
    const taken = await this.prisma.project.findUnique({
      where: { key: input.key },
    });
    if (taken)
      throw new ConflictException(`Key ${input.key} is already in use`);
    return this.prisma.project.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        targetDate: toDate(input.targetDate),
        createdById: userId,
      },
    });
  }

  async findAll(userId: string, query: ListProjectsQuery) {
    const projects = await this.prisma.project.findMany({
      where: {
        createdById: userId,
        archivedAt: query.archived === 'true' ? { not: null } : null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (projects.length === 0) return [];

    // One grouped query for ALL projects, not one count query per project
    const grouped = await this.prisma.ticket.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projects.map((p) => p.id) } },
      _count: { _all: true },
    });

    const byProject = new Map<string, Counts>();
    for (const g of grouped) {
      const key = STATUS_KEY[g.status];
      if (!key) continue; // ignore a status we don't chart, instead of corrupting the counts
      const c = byProject.get(g.projectId) ?? {
        backlog: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      };
      c[key] = g._count._all;
      byProject.set(g.projectId, c);
    }

    return projects.map((p) => ({
      ...p,
      counts: byProject.get(p.id) ?? {
        backlog: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      },
    }));
  }

  // Scoped to the owner: someone else's id looks like "not found"
  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, createdById: userId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(userId: string, id: string, input: UpdateProjectInput) {
    await this.findOne(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        targetDate: toDate(input.targetDate),
        archivedAt:
          input.archived === undefined
            ? undefined
            : input.archived
              ? new Date()
              : null,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted successfully' };
  }
}
