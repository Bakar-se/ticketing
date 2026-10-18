import { PrismaService } from './../prisma/prisma.service.js';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) {}

    create(userId: string, input: { name?: string, description?: string }) {
        if (!input.name) {
            throw new BadRequestException('Name is required');
        }

        return this.prisma.project.create({
            data: {
                name: input.name,
                description: input.description,
                createdById: userId,
            },
        });
    }

    findAll(userId: string) {
        return this.prisma.project.findMany({
            where: {
                createdById: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(projectId: string) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        return project;
    }

    async update(projectId: string, input: { name?: string, description?: string }) {
        await this.findOne(projectId);
        return this.prisma.project.update({
            where: {
                id: projectId,
            },
            data: input,
        });
    }

    async remove(projectId: string) {   
        await this.findOne(projectId);
        await this.prisma.project.delete({
            where: {
                id: projectId,
            },
        });
        return { message: 'Project deleted successfully' };
    }
}
