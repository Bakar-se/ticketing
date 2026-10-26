import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { TicketPriority, TicketStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../queue/notifications.service.js';
import {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from './tickets.schemas.js';
import { toDate } from '../common/date.js';

const withProjectKey = { project: { select: { key: true } } } as const;

// Adds the human-readable id (WEB-12) to what the API returns
function present<T extends { number: number; project: { key: string } }>(
  ticket: T,
) {
  const { project, ...rest } = ticket;
  return {
    ...rest,
    projectKey: project.key,
    ticketKey: `${project.key}-${ticket.number}`,
  };
}

function orderByFor(query: ListTicketsQuery) {
  const dir = query.order;
  switch (query.sort) {
    case 'dueDate':
      return { dueDate: { sort: dir, nulls: 'last' as const } };
    case 'storyPoints':
      return { storyPoints: { sort: dir, nulls: 'last' as const } };
    case 'priority':
      return { priority: dir };
    case 'createdAt':
      return { createdAt: dir };
    default:
      return { number: dir };
  }
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async ownedProject(
    userId: string,
    projectId: string,
    allowArchived = false,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        createdById: userId,
        ...(allowArchived ? {} : { archivedAt: null }),
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async owned(userId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, createdById: userId },
      include: withProjectKey,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(user: SessionUser, projectId: string, input: CreateTicketInput) {
    await this.ownedProject(user.id, projectId);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const { ticketCounter } = await tx.project.update({
        where: { id: projectId },
        data: { ticketCounter: { increment: 1 } },
        select: { ticketCounter: true },
      });
      return tx.ticket.create({
        data: {
          number: ticketCounter,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          storyPoints: input.storyPoints,
          dueDate: toDate(input.dueDate),
          projectId,
          createdById: user.id,
        },
        include: withProjectKey,
      });
    });

    await this.notifications.enqueue({
      type: 'ticket.created',
      ticketId: ticket.id,
      ticketKey: `${ticket.project.key}-${ticket.number}`,
      ticketTitle: ticket.title,
      priority: ticket.priority,
      storyPoints: ticket.storyPoints,
      dueDate: ticket.dueDate
        ? ticket.dueDate.toISOString().slice(0, 10)
        : null,
      recipientEmail: user.email,
      recipientName: user.name,
    });
    return present(ticket);
  }

  async findAll(userId: string, projectId: string, query: ListTicketsQuery) {
    const where = {
      projectId,
      status: query.status,
      priority: query.priority,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              {
                description: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: orderByFor(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: withProjectKey,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return {
      items: items.map(present),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(userId: string, id: string) {
    return present(await this.owned(userId, id));
  }

  async update(userId: string, id: string, input: UpdateTicketInput) {
    await this.owned(userId, id);
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        storyPoints: input.storyPoints,
        dueDate: toDate(input.dueDate),
      },
      include: withProjectKey,
    });
    return present(ticket);
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.ticket.delete({ where: { id } });
    return { id };
  }
}
