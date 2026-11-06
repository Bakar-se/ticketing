// apps/auth/src/lib/email-queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

// Must match the queue name in apps/notifications (two places, same string).
export const AUTH_EMAIL_QUEUE = "auth-emails";

type Recipient = { recipientEmail: string; recipientName: string };

// Must match AuthEmailJob in apps/notifications/src/auth-emails.ts
export type AuthEmailJob = Recipient &
  (
    | { type: "password.reset"; resetUrl: string }
    | { type: "email.verify"; verifyUrl: string }
  );

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const authEmailQueue = new Queue<AuthEmailJob>(AUTH_EMAIL_QUEUE, {
  connection,
});

// Deliberately NOT awaited by callers. If we waited only when the user exists,
// response time would reveal which emails have accounts. The catch keeps a
// Redis hiccup from becoming an unhandled rejection.
export function queueAuthEmail(job: AuthEmailJob) {
  void authEmailQueue
    .add(job.type, job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: { age: 3600 }, // jobs hold one-time tokens, so don't keep failures around
    })
    .catch((err: Error) => console.error(`failed to queue ${job.type} email`, err));
}
