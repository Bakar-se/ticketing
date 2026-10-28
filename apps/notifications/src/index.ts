import { Worker } from "bullmq";
import { Redis } from "ioredis";
import nodemailer from "nodemailer";
import { startAuthEmailWorker } from "./auth-emails";

// Same shape as the api's job. Deliberately duplicated: no shared package between services.
// New fields are optional: jobs queued by an older api version may not have them.
type NotificationJob = {
  type: "ticket.created" | "comment.created";
  ticketId: string;
  ticketKey?: string;
  ticketTitle: string;
  recipientEmail: string;
  recipientName: string;
  priority?: string;
  storyPoints?: number | null;
  dueDate?: string | null;
  commentBody?: string;
};

function buildEmail(d: NotificationJob) {
  const tag = d.ticketKey ?? "Ticket";
  const label = d.ticketKey
    ? `${d.ticketKey}: ${d.ticketTitle}`
    : d.ticketTitle;

  if (d.type === "ticket.created") {
    const lines = [`Hi ${d.recipientName}, ticket ${label} was created.`, ""];
    if (d.priority) lines.push(`Priority: ${d.priority}`);
    if (d.storyPoints) lines.push(`Story points: ${d.storyPoints}`);
    if (d.dueDate) lines.push(`Due: ${d.dueDate}`);
    return {
      subject: `[${tag}] Created: ${d.ticketTitle}`,
      text: lines.join("\n"),
    };
  }

  return {
    subject: `[${tag}] New comment: ${d.ticketTitle}`,
    text: `Hi ${d.recipientName}, a comment was added to ${label}:\n\n${d.commentBody ?? ""}`,
  };
}

// BullMQ workers hold blocking Redis calls, so retries per request must be unlimited
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false, // Mailpit speaks plain SMTP with no auth
});

const worker = new Worker<NotificationJob>(
  "notifications", // must match the queue name in the api
  async (job) => {
    const { subject, text } = buildEmail(job.data);
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "tickets@example.local",
      to: job.data.recipientEmail,
      subject,
      text,
    });
  },
  { connection, concurrency: 5 },
);

worker.on("completed", (job) =>
  console.log(`sent ${job.name} (job ${job.id})`),
);
worker.on("failed", (job, err) =>
  console.error(`job ${job?.id} failed: ${err.message}`),
);
console.log('notifications worker listening on queue "notifications"');

const authWorker = startAuthEmailWorker(connection, transport);

// Kubernetes sends SIGTERM when it stops a pod: finish the current job, then exit
const shutdown = async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
