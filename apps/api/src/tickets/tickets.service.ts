import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const STATUSES = new Set<string>(Object.values(TicketStatus))

@Injectable()
export class TicketsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, projectId: string, input: { title?: string, description?: string }) {
        if (!input.title) {
            throw new BadRequestException('Title is required');
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                createdById: userId,
            },
        });
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        return this.prisma.ticket.create({
            data: {
                title: input.title,
                description: input.description,
                projectId,
                createdById: userId,
            },
        });
    }

    async findAll(userId: string, projectId: string) {
        const project = await this.prisma.project.findFirst({
          where: { id: projectId, createdById: userId },
        });
        if (!project) {
          throw new NotFoundException('Project not found');
        }
        return this.prisma.ticket.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
        });
      }

      async findOne(userId: string, id: string) {
        const ticket = await this.prisma.ticket.findFirst({
          where: { id, createdById: userId },
        });
        if (!ticket) {
          throw new NotFoundException();
        }
        return ticket;
      }

      async update(
        userId: string,
        id: string,
        input: { title?: string; description?: string; status?: string },
      ) {
        await this.findOne(userId, id);
        if (input.status !== undefined && !STATUSES.has(input.status)) {
          throw new BadRequestException('status must be TODO, IN_PROGRESS, or DONE');
        }
        return this.prisma.ticket.update({
          where: { id },
          data: {
            title: input.title,
            description: input.description,
            status: input.status as TicketStatus | undefined,
          },
        });
      }
      async remove(userId: string, id: string) {
        await this.findOne(userId, id);
        await this.prisma.ticket.delete({ where: { id } });
        return { id };
      }
}
