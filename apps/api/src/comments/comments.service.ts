import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../queue/notifications.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async ownedTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, createdById: userId },
      include: { project: { select: { key: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(user: SessionUser, ticketId: string, input: { body?: string }) {
    if (!input.body) throw new BadRequestException('body is required');
    const ticket = await this.ownedTicket(user.id, ticketId);
    const comment = await this.prisma.comment.create({
      data: { body: input.body, ticketId, createdById: user.id },
    });
    await this.notifications.enqueue({
      type: 'comment.created',
      ticketId,
      ticketKey: `${ticket.project.key}-${ticket.number}`,
      ticketTitle: ticket.title,
      recipientEmail: user.email,
      recipientName: user.name,
      commentBody: comment.body,
    });
    return comment;
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
    if (!comment) throw new NotFoundException();
    await this.prisma.comment.delete({ where: { id } });
    return { id };
  }
}
