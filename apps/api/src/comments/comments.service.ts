import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service.js';
  
  @Injectable()
  export class CommentsService {
    constructor(private readonly prisma: PrismaService) {}
  
    private async ownedTicket(userId: string, ticketId: string) {
      const ticket = await this.prisma.ticket.findFirst({
        where: { id: ticketId, createdById: userId },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }
      return ticket;
    }
  
    async create(userId: string, ticketId: string, input: { body?: string }) {
      if (!input.body) {
        throw new BadRequestException('body is required');
      }
      await this.ownedTicket(userId, ticketId);
      return this.prisma.comment.create({
        data: {
          body: input.body,
          ticketId,
          createdById: userId,
        },
      });
    }
  
    async findAll(userId: string, ticketId: string) {
      await this.ownedTicket(userId, ticketId);
      return this.prisma.comment.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
      });
    }
  
    async remove(userId: string, id: string) {
      const comment = await this.prisma.comment.findFirst({
        where: { id, createdById: userId },
      });
      if (!comment) {
        throw new NotFoundException();
      }
      await this.prisma.comment.delete({ where: { id } });
      return { id };
    }
  }