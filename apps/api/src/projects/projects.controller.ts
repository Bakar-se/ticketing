import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.guard.js';

type ProjectBody = { name?: string; description?: string };

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: ProjectBody) {
    return this.projects.create(user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: SessionUser) {
    return this.projects.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.projects.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() body: ProjectBody) {
    return this.projects.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.projects.remove(user.id, id);
  }
}