import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Global() // available everywhere without importing it into each module
@Module({ providers: [NotificationsService], exports: [NotificationsService] })
export class QueueModule {}