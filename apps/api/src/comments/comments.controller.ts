import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type { SessionUser } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user/current-user.decorator.js';
import { CommentsService } from './comments.service.js';

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post('tickets/:ticketId/comments')
  create(
    @CurrentUser() user: SessionUser,
    @Param('ticketId') ticketId: string,
    @Body() body: { body?: string },
  ) {
    return this.comments.create(user, ticketId, body);
  }

  @Get('tickets/:ticketId/comments')
  findAll(
    @CurrentUser() user: SessionUser,
    @Param('ticketId') ticketId: string,
  ) {
    return this.comments.findAll(user.id, ticketId);
  }

  @Delete('comments/:id')
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.comments.remove(user.id, id);
  }
}