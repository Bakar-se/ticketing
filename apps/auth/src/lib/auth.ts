import { betterAuth } from "better-auth";
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
