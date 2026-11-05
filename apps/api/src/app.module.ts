import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard, SessionReader } from './auth/auth.guard.js';
import { AcceptInvitesInterceptor } from './membership/accept-invites.interceptor.js';
import { MembershipModule } from './membership/membership.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [
    PrismaModule,
    MembershipModule,
    ProjectsModule,
    TicketsModule,
    CommentsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SessionReader,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AcceptInvitesInterceptor },
  ],
})
export class AppModule {}
