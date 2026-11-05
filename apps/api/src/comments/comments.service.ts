import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { MembershipService } from '../membership/membership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../queue/notifications.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly membership: MembershipService,
  ) {}

  async create(user: SessionUser, ticketId: string, input: { body?: string }) {
    if (!input.body) throw new BadRequestException('body is required');
    const { ticket } = await this.membership.visibleTicket(user.id, ticketId);
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
    await this.membership.visibleTicket(userId, ticketId);
    return this.prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(userId: string, id: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id },
      include: { ticket: { select: { projectId: true } } },
    });
    if (!comment || comment.createdById !== userId) {
      throw new NotFoundException();
    }
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: comment.ticket.projectId, userId },
      },
    });
    if (!member) throw new NotFoundException();
    await this.prisma.comment.delete({ where: { id } });
    return { id };
  }
}
