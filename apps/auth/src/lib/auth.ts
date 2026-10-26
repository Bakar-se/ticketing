import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { expo } from "@better-auth/expo";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
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
