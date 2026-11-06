import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { expo } from "@better-auth/expo";
import { prisma } from "./prisma";
import { queueAuthEmail } from "./email-queue";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      queueAuthEmail({
        type: "password.reset",
        recipientEmail: user.email,
        recipientName: user.name,
        resetUrl: url,
      });
    },
  },
  // Verification proves a person owns their address. Signing in doesn't
  // require it, but changing email does (#11).
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Better Auth also calls this for the second step of an email change,
      // with `user.email` set to the new address while the account still has
      // the old one. That case gets its own wording.
      const stored = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      if (stored && stored.email !== user.email) {
        queueAuthEmail({
          type: "email.change.confirm",
          recipientEmail: user.email,
          recipientName: user.name,
          confirmUrl: url,
        });
        return;
      }
      queueAuthEmail({
        type: "email.verify",
        recipientEmail: user.email,
        recipientName: user.name,
        verifyUrl: url,
      });
    },
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
    },
    // Two steps: the current address approves, then the new one confirms.
    // Better Auth only runs the approval step for a verified address, so the
    // hook below refuses changes from unverified ones.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        queueAuthEmail({
          type: "email.change.approve",
          recipientEmail: user.email,
          recipientName: user.name,
          newEmail,
          approveUrl: url,
        });
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-email") return;
      const session = await getSessionFromCtx(ctx);
      if (session && !session.user.emailVerified) {
        throw new APIError("FORBIDDEN", {
          code: "EMAIL_NOT_VERIFIED",
          message: "Verify your email before changing it.",
        });
      }
    }),
  },
  plugins: [expo()], // lets native apps authenticate
  trustedOrigins: [
    process.env.WEB_ORIGIN!,
    "Trackbit://", // deep-link scheme of the mobile app (used by standalone builds)
    // Expo Go connects as exp://<laptop-ip>:8081. Trust that only in development.
    ...(process.env.EXPO_DEV === "true" ? ["exp://**"] : []),
  ],
  advanced: {
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
});
