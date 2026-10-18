import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { TicketsService } from './tickets.service.js';

@Controller()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post('projects/:projectId/tickets')
  create(
    @CurrentUser() user: SessionUser,
    @Param('projectId') projectId: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.tickets.create(user.id, projectId, body);
  }

  @Get('projects/:projectId/tickets')
  findAll(
    @CurrentUser() user: SessionUser,
    @Param('projectId') projectId: string,
  ) {
    return this.tickets.findAll(user.id, projectId);
  }

  @Get('tickets/:id')
  findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.tickets.findOne(user.id, id);
  }

  @Patch('tickets/:id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; status?: string },
  ) {
    return this.tickets.update(user.id, id, body);
  }

  @Delete('tickets/:id')
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.tickets.remove(user.id, id);
  }
}