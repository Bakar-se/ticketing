import { Worker, type ConnectionOptions } from "bullmq";
import type { Transporter } from "nodemailer";

type Recipient = { recipientEmail: string; recipientName: string };

// Job shapes must match what apps/auth queues
export type AuthEmailJob = Recipient &
  (
    | { type: "password.reset"; resetUrl: string }
    | { type: "email.verify"; verifyUrl: string }
    | { type: "email.change.approve"; newEmail: string; approveUrl: string }
    | { type: "email.change.confirm"; confirmUrl: string }
  );

export function buildAuthEmail(d: AuthEmailJob): { subject: string; text: string } {
  switch (d.type) {
    case "email.change.confirm":
      return {
        subject: "Confirm your new email address",
        text: [
          `Hi ${d.recipientName},`,
          "",
          `You approved a request to change the email on your Trackbit account to ${d.recipientEmail}.`,
          "Use this link to confirm it. Until you do, your account keeps its current email:",
          d.confirmUrl,
          "",
          "The link expires in 1 hour. If you didn't ask for this, you can ignore this email.",
        ].join("\n"),
      };
    case "email.change.approve":
      return {
        subject: "Approve your new email address",
        text: [
          `Hi ${d.recipientName},`,
          "",
          `Someone asked to change the email on your Trackbit account to ${d.newEmail}.`,
          "If that was you, approve the change with this link. We'll then send a confirmation link to the new address:",
          d.approveUrl,
          "",
          "The link expires in 1 hour. If you didn't ask for this, don't open the link, and consider changing your password.",
        ].join("\n"),
      };
    case "email.verify":
      return {
        subject: "Confirm your email address",
        text: [
          `Hi ${d.recipientName},`,
          "",
          `Use this link to confirm that ${d.recipientEmail} is your email address:`,
          d.verifyUrl,
          "",
          "The link expires in 1 hour. If you didn't ask for this, you can ignore this email.",
        ].join("\n"),
      };
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
