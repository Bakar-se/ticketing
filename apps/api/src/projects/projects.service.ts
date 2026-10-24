import {
  BadRequestException,
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

  findAll(userId: string, query: ListProjectsQuery) {
    return this.prisma.project.findMany({
      where: {
        createdById: userId,
        archivedAt: query.archived === 'true' ? { not: null } : null,
      },
      orderBy: { createdAt: 'desc' },
    });
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
