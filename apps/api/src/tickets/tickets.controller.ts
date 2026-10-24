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
import type { SessionUser } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { TicketsService } from './tickets.service.js';
import {
  createTicketSchema,
  listTicketsSchema,
  updateTicketSchema,
  type CreateTicketInput,
  type ListTicketsQuery,
  type UpdateTicketInput,
} from './tickets.schemas.js';

@Controller()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post('projects/:projectId/tickets')
  create(
    @CurrentUser() user: SessionUser,
    @Param('projectId') projectId: string,
    @Body(new ZodPipe(createTicketSchema)) body: CreateTicketInput,
  ) {
    return this.tickets.create(user, projectId, body);
  }

  @Get('projects/:projectId/tickets')
  findAll(
    @CurrentUser() user: SessionUser,
    @Param('projectId') projectId: string,
    @Query(new ZodPipe(listTicketsSchema)) query: ListTicketsQuery,
  ) {
    return this.tickets.findAll(user.id, projectId, query);
  }

  @Get('tickets/:id')
  findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.tickets.findOne(user.id, id);
  }

  @Patch('tickets/:id')
  update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodPipe(updateTicketSchema)) body: UpdateTicketInput,
  ) {
    return this.tickets.update(user.id, id, body);
  }

  @Delete('tickets/:id')
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.tickets.remove(user.id, id);
  }
}
