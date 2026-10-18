import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.guard.js';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projects: ProjectsService) {}

    @Post()
    create(
        @CurrentUser() user: SessionUser,
        @Body() body: { name?: string, description?: string }) {
        return this.projects.create(user.id, body);
    }

    @Get()
    findAll(@CurrentUser() user: SessionUser) {
        return this.projects.findAll(user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projects.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: { name?: string, description?: string }) {
        return this.projects.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.projects.remove(id);
    }
}
