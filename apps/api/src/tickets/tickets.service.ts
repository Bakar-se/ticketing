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
      return [{ dueDate: { sort: dir, nulls: 'last' as const } }];
    case 'storyPoints':
      return [{ storyPoints: { sort: dir, nulls: 'last' as const } }];
    case 'priority':
      return [{ priority: dir }];
    case 'createdAt':
      return [{ createdAt: dir }];
    case 'position':
      return [{ position: dir }, { number: 'asc' as const }];
    default:
      return [{ number: dir }];
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
      const status = input.status ?? TicketStatus.BACKLOG;
      const max = await tx.ticket.aggregate({
        where: { projectId, status },
        _max: { position: true },
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
          position: (max._max.position ?? -1) + 1,
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
    const existing = await this.owned(userId, id);
    if (input.assigneeId) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existing.projectId,
            userId: input.assigneeId,
          },
        },
      });
      if (!member) {
        throw new BadRequestException(
          'Assignee is not a member of this project',
        );
      }
    }

    let position: number | undefined;
    if (input.status && input.status !== existing.status) {
      const max = await this.prisma.ticket.aggregate({
        where: { projectId: existing.projectId, status: input.status },
        _max: { position: true },
      });
      position = (max._max.position ?? -1) + 1;
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        storyPoints: input.storyPoints,
        dueDate: toDate(input.dueDate),
        assigneeId: input.assigneeId,
        position,
      },
      include: withProjectKey,
    });
    return present(ticket);
  }

  async reorder(userId: string, projectId: string, ids: string[]) {
    await this.ownedProject(userId, projectId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Ticket ids must be unique');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: { projectId, status: TicketStatus.BACKLOG },
      select: { id: true },
    });
    const current = new Set(tickets.map((ticket) => ticket.id));
    const sameSet =
      ids.length === current.size && ids.every((id) => current.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        'Reorder must include every backlog ticket',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.ticket.update({ where: { id }, data: { position } }),
      ),
    );
    return { ids };
  }

  async remove(userId: string, id: string) {
    await this.owned(userId, id);
    await this.prisma.ticket.delete({ where: { id } });
    return { id };
  }
}
