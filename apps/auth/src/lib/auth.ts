import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { expo } from "@better-auth/expo";
import { prisma } from "./prisma";
import { authEmailQueue } from "./email-queue";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Deliberately NOT awaited. If we waited only when the user exists, response
      // time would reveal which emails have accounts. The catch keeps a Redis
      // hiccup from becoming an unhandled rejection.
      void authEmailQueue
        .add(
          "password.reset",
          {
            type: "password.reset",
            recipientEmail: user.email,
            recipientName: user.name,
            resetUrl: url,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: true,
            removeOnFail: { age: 3600 }, // the job holds a reset token, so don't keep failures around
          },
        )
        .catch((err: Error) =>
          console.error("failed to queue reset email", err),
        );
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
    "ticketing://", // deep-link scheme of the mobile app (used by standalone builds)
    // Expo Go connects as exp://<laptop-ip>:8081. Trust that only in development.
    ...(process.env.EXPO_DEV === "true" ? ["exp://**"] : []),
  ],
});
