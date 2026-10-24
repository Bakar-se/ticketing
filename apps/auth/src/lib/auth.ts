import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
    },
  },
  // Origins allowed to call the auth endpoints (the Next.js app)
  trustedOrigins: [process.env.WEB_ORIGIN!],
});
