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
import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.guard.js';
import { ZodPipe } from '../common/zod.pipe.js';
import {
  createProjectSchema,
  listProjectsSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsQuery,
  type UpdateProjectInput,
} from './projects.schemas.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

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
