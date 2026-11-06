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

  it("asks the current address to approve a change to a new one", () => {
    const email = buildAuthEmail({
      type: "email.change.approve",
      recipientEmail: "alex@company.com",
      recipientName: "Alex Doe",
      newEmail: "alexandra@company.com",
      approveUrl: "http://localhost:3000/api/auth/verify-email?token=def",
    });
    expect(email.subject).toBe("Approve your new email address");
    expect(email.text).toContain("alexandra@company.com");
    expect(email.text).toContain("http://localhost:3000/api/auth/verify-email?token=def");
    expect(email.text).toContain("If you didn't ask for this, don't open the link");
  });

  it("asks the new address to confirm a change once the old one approved", () => {
    const email = buildAuthEmail({
      type: "email.change.confirm",
      recipientEmail: "alexandra@company.com",
      recipientName: "Alex Doe",
      confirmUrl: "http://localhost:3000/api/auth/verify-email?token=ghi",
    });
    expect(email.subject).toBe("Confirm your new email address");
    expect(email.text).toContain("change the email on your Trackbit account to alexandra@company.com");
    expect(email.text).toContain("http://localhost:3000/api/auth/verify-email?token=ghi");
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
