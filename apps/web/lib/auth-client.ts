import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  fetchOptions: { credentials: "include" }, // send and receive the session cookie
  plugins: [
    inferAdditionalFields({
      user: { phone: { type: "string", required: false } },
    }),
  ],
});
