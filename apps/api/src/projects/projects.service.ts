import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type ProjectInput = { name?: string; description?: string };

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, input: ProjectInput) {
    if (!input.name) throw new BadRequestException('Name is required');
    return this.prisma.project.create({
      data: { name: input.name, description: input.description, createdById: userId },
    });
  }

  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Scoped to the owner: someone else's id looks like "not found"
  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, createdById: userId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(userId: string, id: string, input: ProjectInput) {
    await this.findOne(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: { name: input.name, description: input.description }, // explicit fields only
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted successfully' };
  }
}