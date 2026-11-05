import { ConflictException, Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { ProjectRole } from '../generated/prisma/enums.js';
import { MembershipService } from '../membership/membership.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async create(user: SessionUser, input: CreateProjectInput) {
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
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: ProjectRole.OWNER,
          },
        },
      },
    });
  }

  async findAll(userId: string, query: ListProjectsQuery) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: { some: { userId } },
        archivedAt: query.archived === 'true' ? { not: null } : null,
      },
      include: {
        members: { where: { userId }, select: { role: true } },
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

    return projects.map((p) => {
      const { members, ...project } = p;
      return {
        ...project,
        role: members[0]?.role ?? ProjectRole.MEMBER,
        counts: byProject.get(p.id) ?? {
          backlog: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
        },
      };
    });
  }

  async members(user: SessionUser, id: string) {
    await this.membership.projectFor(user.id, id);
    return this.prisma.projectMember.findMany({
      where: { projectId: id },
      orderBy: { name: 'asc' },
      select: { userId: true, name: true, email: true, role: true },
    });
  }

  async findOne(userId: string, id: string) {
    const { project, member } = await this.membership.projectFor(userId, id);
    return { ...project, role: member.role };
  }

  async update(userId: string, id: string, input: UpdateProjectInput) {
    await this.membership.requireOwner(userId, id);
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
    await this.membership.requireOwner(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted successfully' };
  }
}
