import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

type TicketNotification = {
  type: 'ticket.created' | 'comment.created';
  ticketId: string;
  ticketKey: string; // e.g. WEB-12
  ticketTitle: string;
  recipientEmail: string;
  recipientName: string;
  priority?: string;
  storyPoints?: number | null;
  dueDate?: string | null; // YYYY-MM-DD
  commentBody?: string;
};

export type InviteNotification = {
  type: 'project.invite';
  recipientEmail: string;
  projectName: string;
  boardUrl: string;
};

export type NotificationJob = TicketNotification | InviteNotification;

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly connection = new Redis(process.env.REDIS_URL!);
  private readonly queue = new Queue<NotificationJob>('notifications', {
    connection: this.connection,
  });

  // Best effort: the record is already saved, so a Redis hiccup must not turn it into a 500.
  // false means the job never reached the queue.
  async enqueue(job: NotificationJob): Promise<boolean> {
    try {
      await this.queue.add(job.type, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }, // retry after 1s, 2s, ...
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Could not enqueue ${job.type}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
