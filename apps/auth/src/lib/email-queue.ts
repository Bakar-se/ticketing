// apps/auth/src/lib/email-queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

// Must match the queue name in apps/notifications (two places, same string).
export const AUTH_EMAIL_QUEUE = "auth-emails";

export type AuthEmailJob = {
  type: "password.reset";
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
};

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const authEmailQueue = new Queue<AuthEmailJob>(AUTH_EMAIL_QUEUE, {
  connection,
});
