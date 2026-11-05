import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectRole } from '../generated/prisma/enums.js';
import { MembershipService } from '../membership/membership.service.js';
import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import {
  createProjectSchema,
  inviteSchema,
  listProjectsSchema,
  memberRoleSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type InviteInput,
  type ListProjectsQuery,
  type MemberRoleInput,
  type UpdateProjectInput,
} from './projects.schemas.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly membership: MembershipService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(createProjectSchema)) body: CreateProjectInput,
  ) {
    return this.projects.create(user, body);
  }

  @Get()
  findAll(
    @CurrentUser() user: SessionUser,
    @Query(new ZodPipe(listProjectsSchema)) query: ListProjectsQuery,
  ) {
    return this.projects.findAll(user.id, query);
  }

  @Get(':id/members')
  members(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.projects.members(user, id);
  }

  @Get(':id/team')
  team(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.membership.team(user.id, id);
  }

  @Post(':id/invites')
  invite(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodPipe(inviteSchema)) body: InviteInput,
  ) {
    return this.membership.invite(user, id, body.email);
  }

  @Post(':id/invites/:inviteId/resend')
  resend(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.membership.resend(user.id, id, inviteId);
  }

  @Delete(':id/invites/:inviteId')
  cancelInvite(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.membership.cancel(user.id, id, inviteId);
  }

  @Patch(':id/members/:userId')
  setRole(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(new ZodPipe(memberRoleSchema)) body: MemberRoleInput,
  ) {
    return this.membership.setRole(
      user.id,
      id,
      userId,
      body.role === 'OWNER' ? ProjectRole.OWNER : ProjectRole.MEMBER,
    );
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.membership.remove(user.id, id, userId);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.membership.leave(user.id, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.projects.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodPipe(updateProjectSchema)) body: UpdateProjectInput,
  ) {
    return this.projects.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.projects.remove(user.id, id);
  }
}
