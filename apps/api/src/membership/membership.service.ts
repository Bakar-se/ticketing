import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { ProjectRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../queue/notifications.service.js';

const INVITE_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_OWNER =
  'This project needs an Owner. Hand the role to another member first.';

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // A project created before teams may have no member row. Name and email
  // live on the session, so the creator becomes Owner on their next request.
  async ensureCreator(user: SessionUser) {
    const missing = await this.prisma.project.findMany({
      where: {
        createdById: user.id,
        members: { none: { userId: user.id } },
      },
      select: { id: true },
    });
    if (missing.length === 0) return;
    await this.prisma.projectMember.createMany({
      data: missing.map((project) => ({
        projectId: project.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: ProjectRole.OWNER,
      })),
      skipDuplicates: true,
    });
  }

  async acceptPending(user: SessionUser) {
    const email = user.email.trim().toLowerCase();
    if (!email) return;
    const invites = await this.prisma.projectInvite.findMany({
      where: { email, expiresAt: { gt: new Date() } },
    });
    if (invites.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
      for (const invite of invites) {
        await tx.projectMember.upsert({
          where: {
            projectId_userId: { projectId: invite.projectId, userId: user.id },
          },
          create: {
            projectId: invite.projectId,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: ProjectRole.MEMBER,
          },
          update: {},
        });
        await tx.projectInvite.deleteMany({ where: { id: invite.id } });
      }
    });
  }

  async projectFor(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Project not found');
    return { project, member };
  }

  async requireOwner(userId: string, projectId: string) {
    const access = await this.projectFor(userId, projectId);
    if (access.member.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only an Owner can do that');
    }
    return access;
  }

  async visibleTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { project: { select: { key: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: ticket.projectId, userId } },
    });
    if (!member) throw new NotFoundException('Ticket not found');
    return { ticket, member };
  }

  async team(userId: string, projectId: string) {
    await this.projectFor(userId, projectId);
    const [members, invites] = await Promise.all([
      this.prisma.projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        select: {
          userId: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.projectInvite.findMany({
        where: { projectId },
        orderBy: { sentAt: 'asc' },
        select: {
          id: true,
          email: true,
          sentAt: true,
          expiresAt: true,
          sendFailed: true,
        },
      }),
    ]);
    return {
      members: members.map((member) => ({
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedAt: member.createdAt,
      })),
      invites,
    };
  }

  async invite(
    user: SessionUser,
    projectId: string,
    emailInput: string,
  ) {
    const { project } = await this.requireOwner(user.id, projectId);
    const email = emailInput.trim().toLowerCase();
    const already = await this.prisma.projectMember.findFirst({
      where: { projectId, email: { equals: email, mode: 'insensitive' } },
    });
    if (already) {
      throw new ConflictException(
        'That person is already a member of this project.',
      );
    }
    const existing = await this.prisma.projectInvite.findUnique({
      where: { projectId_email: { projectId, email } },
    });
    if (existing && existing.expiresAt > new Date()) {
      throw new ConflictException(
        'An invite is already waiting for that email. Resend it instead.',
      );
    }
    if (existing) return this.resend(user.id, projectId, existing.id);
    const sentAt = new Date();
    const invite = await this.prisma.projectInvite.create({
      data: {
        projectId,
        email,
        sentAt,
        expiresAt: new Date(sentAt.getTime() + INVITE_MS),
      },
    });
    return this.markDelivery(invite.id, project.name, projectId, email);
  }

  async resend(userId: string, projectId: string, inviteId: string) {
    const { project } = await this.requireOwner(userId, projectId);
    const invite = await this.prisma.projectInvite.findFirst({
      where: { id: inviteId, projectId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    const sentAt = new Date();
    await this.prisma.projectInvite.update({
      where: { id: invite.id },
      data: {
        sentAt,
        expiresAt: new Date(sentAt.getTime() + INVITE_MS),
        sendFailed: false,
      },
    });
    return this.markDelivery(invite.id, project.name, projectId, invite.email);
  }

  async cancel(userId: string, projectId: string, inviteId: string) {
    await this.requireOwner(userId, projectId);
    const result = await this.prisma.projectInvite.deleteMany({
      where: { id: inviteId, projectId },
    });
    if (result.count === 0) throw new NotFoundException('Invite not found');
    return { id: inviteId };
  }

  async setRole(
    userId: string,
    projectId: string,
    memberUserId: string,
    role: ProjectRole,
  ) {
    await this.requireOwner(userId, projectId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockOwners(tx, projectId);
      const target = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberUserId } },
      });
      if (!target) throw new NotFoundException('Member not found');
      if (target.role === ProjectRole.OWNER && role === ProjectRole.MEMBER) {
        await this.keepAnOwner(tx, projectId);
      }
      return tx.projectMember.update({
        where: { id: target.id },
        data: { role },
        select: { userId: true, name: true, email: true, role: true },
      });
    });
  }

  async remove(userId: string, projectId: string, memberUserId: string) {
    await this.requireOwner(userId, projectId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockOwners(tx, projectId);
      const target = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberUserId } },
      });
      if (!target) throw new NotFoundException('Member not found');
      if (target.role === ProjectRole.OWNER) await this.keepAnOwner(tx, projectId);
      await this.dropMember(tx, projectId, target.userId, target.id);
    });
    return { userId: memberUserId };
  }

  async leave(userId: string, projectId: string) {
    const { member } = await this.projectFor(userId, projectId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockOwners(tx, projectId);
      const current = await tx.projectMember.findUnique({
        where: { id: member.id },
      });
      if (!current) throw new NotFoundException('Member not found');
      if (current.role === ProjectRole.OWNER) await this.keepAnOwner(tx, projectId);
      await this.dropMember(tx, projectId, current.userId, current.id);
    });
    return { userId };
  }

  // Hold the Owner rows until the role change commits, so two overlapping
  // demotions cannot both see a spare Owner and leave the project with none.
  private async lockOwners(
    db: { $queryRaw: PrismaService['$queryRaw'] },
    projectId: string,
  ) {
    await db.$queryRaw`
      SELECT id FROM "ProjectMember"
      WHERE "projectId" = ${projectId} AND role = 'OWNER'::"ProjectRole"
      FOR UPDATE
    `;
  }

  private async keepAnOwner(
    db: Pick<PrismaService, 'projectMember'>,
    projectId: string,
  ) {
    const owners = await db.projectMember.count({
      where: { projectId, role: ProjectRole.OWNER },
    });
    if (owners <= 1) throw new ConflictException(LAST_OWNER);
  }

  private async dropMember(
    db: Pick<PrismaService, 'ticket' | 'projectMember'>,
    projectId: string,
    userId: string,
    memberId: string,
  ) {
    await db.ticket.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    });
    await db.projectMember.delete({ where: { id: memberId } });
  }

  private async markDelivery(
    inviteId: string,
    projectName: string,
    projectId: string,
    email: string,
  ) {
    const queued = await this.notifications.enqueue({
      type: 'project.invite',
      recipientEmail: email,
      projectName,
      boardUrl: `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/projects/${projectId}`,
    });
    return this.prisma.projectInvite.update({
      where: { id: inviteId },
      data: { sendFailed: !queued },
      select: {
        id: true,
        email: true,
        sentAt: true,
        expiresAt: true,
        sendFailed: true,
      },
    });
  }
}
