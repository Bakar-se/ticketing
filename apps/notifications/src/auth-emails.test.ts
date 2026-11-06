import { describe, expect, it } from "vitest";
import { buildAuthEmail } from "./auth-emails";

describe("auth emails", () => {
  it("asks a person to confirm their email address with a link", () => {
    const email = buildAuthEmail({
      type: "email.verify",
      recipientEmail: "alex@company.com",
      recipientName: "Alex Doe",
      verifyUrl: "http://localhost:3000/api/auth/verify-email?token=abc",
    });
    expect(email.subject).toBe("Confirm your email address");
    expect(email.text).toContain("Hi Alex Doe,");
    expect(email.text).toContain("http://localhost:3000/api/auth/verify-email?token=abc");
    expect(email.text).toContain("expires in 1 hour");
  });

  it("still builds the password reset email", () => {
    const email = buildAuthEmail({
      type: "password.reset",
      recipientEmail: "alex@company.com",
      recipientName: "Alex Doe",
      resetUrl: "http://localhost:3000/reset-password?token=xyz",
    });
    expect(email.subject).toBe("Reset your password");
    expect(email.text).toContain("http://localhost:3000/reset-password?token=xyz");
  });
});
