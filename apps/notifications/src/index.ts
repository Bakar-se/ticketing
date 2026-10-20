import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';

// Same shape as the api's job. Deliberately duplicated: no shared package between services.
type NotificationJob = {
  type: 'ticket.created' | 'comment.created';
  ticketId: string;
  ticketTitle: string;
  recipientEmail: string;
  recipientName: string;
  commentBody?: string;
};

// BullMQ workers hold blocking Redis calls, so retries per request must be unlimited
const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false, // Mailpit speaks plain SMTP with no auth
});

const worker = new Worker<NotificationJob>(
  'notifications', // must match the queue name in the api
  async (job) => {
    const d = job.data;
    const subject =
      d.type === 'ticket.created'
        ? `Ticket created: ${d.ticketTitle}`
        : `New comment on: ${d.ticketTitle}`;
    const text =
      d.type === 'ticket.created'
        ? `Hi ${d.recipientName}, your ticket "${d.ticketTitle}" was created.`
        : `Hi ${d.recipientName}, a comment was added to "${d.ticketTitle}":\n\n${d.commentBody}`;
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? 'tickets@example.local',
      to: d.recipientEmail,
      subject,
      text,
    });
  },
  { connection, concurrency: 5 },
);

worker.on('completed', (job) => console.log(`sent ${job.name} (job ${job.id})`));
worker.on('failed', (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
console.log('notifications worker listening on queue "notifications"');

// Kubernetes sends SIGTERM when it stops a pod: finish the current job, then exit
const shutdown = async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
