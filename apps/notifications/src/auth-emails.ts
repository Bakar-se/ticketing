import { Worker, type ConnectionOptions } from "bullmq";
import type { Transporter } from "nodemailer";

type AuthEmailJob = {
  type: "password.reset";
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
};

function buildAuthEmail(d: AuthEmailJob): { subject: string; text: string } {
  switch (d.type) {
    case "password.reset":
      return {
        subject: "Reset your password",
        text: [
          `Hi ${d.recipientName},`,
          "",
          "We received a request to reset your password. Use this link to choose a new one:",
          d.resetUrl,
          "",
          "The link expires in 1 hour and works once. If you didn't ask for this, you can ignore this email.",
        ].join("\n"),
      };
  }
}

export function startAuthEmailWorker(
  connection: ConnectionOptions,
  transport: Transporter,
) {
  return new Worker<AuthEmailJob>(
    "auth-emails", // must match AUTH_EMAIL_QUEUE in apps/auth
    async (job) => {
      const { subject, text } = buildAuthEmail(job.data);
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? "tickets@trackbit.local",
        to: job.data.recipientEmail,
        subject,
        text,
      });
    },
    { connection, concurrency: 5 },
  );
}
