import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  fetchOptions: { credentials: "include" }, // send/receive the session cookie across ports
  plugins: [
    inferAdditionalFields({
      user: { phone: { type: "string", required: false } },
    }),
  ],
});
