import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePassword } from "@/components/profile-password";
import { authClient } from "@/lib/auth-client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/password",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "alex", name: "Alex Doe", email: "alex@company.com" } },
      isPending: false,
    }),
    changePassword: vi.fn(),
    signOut: vi.fn(),
  },
}));

const ok = { data: { token: "t" }, error: null } as never;

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { current = "", next = "", confirm = "" },
) {
  if (current) await user.type(screen.getByLabelText("Current password"), current);
  if (next) await user.type(screen.getByLabelText("New password"), next);
  if (confirm) await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Update password" }));
}

beforeEach(() => {
  vi.mocked(authClient.changePassword).mockReset();
  vi.mocked(authClient.changePassword).mockResolvedValue(ok);
});

describe("profile password tab", () => {
  it("shows the password card with other devices signed out by default", () => {
    render(<ProfilePassword />);
    expect(screen.getByRole("link", { name: "Password" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("href", "/profile");
    expect(screen.getByText("Change the password you use to sign in.")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveAccessibleDescription(
      "At least 8 characters.",
    );
    expect(screen.getByRole("checkbox", { name: "Sign out of other devices" })).toBeChecked();
  });

  it("changes the password and signs out other devices", async () => {
    const user = userEvent.setup();
    render(<ProfilePassword />);
    await fill(user, { current: "password123", next: "newpassword456", confirm: "newpassword456" });

    await waitFor(() =>
      expect(authClient.changePassword).toHaveBeenCalledWith({
        currentPassword: "password123",
        newPassword: "newpassword456",
        revokeOtherSessions: true,
      }),
    );
    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
  });

  it("keeps other devices signed in when the box is unticked", async () => {
    const user = userEvent.setup();
    render(<ProfilePassword />);
    await user.click(screen.getByRole("checkbox", { name: "Sign out of other devices" }));
    await fill(user, { current: "password123", next: "newpassword456", confirm: "newpassword456" });
    await waitFor(() =>
      expect(authClient.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({ revokeOtherSessions: false }),
      ),
    );
  });

  it.each([
    {
      why: "a missing current password",
      input: { next: "newpassword456", confirm: "newpassword456" },
      field: "Current password",
      message: "Enter your current password",
    },
    {
      why: "a new password under 8 characters",
      input: { current: "password123", next: "short", confirm: "short" },
      field: "New password",
      message: "Use at least 8 characters",
    },
    {
      why: "a confirmation that doesn't match",
      input: { current: "password123", next: "newpassword456", confirm: "newpassword789" },
      field: "Confirm new password",
      message: "Passwords do not match",
    },
    {
      why: "a new password equal to the current one",
      input: { current: "password123", next: "password123", confirm: "password123" },
      field: "New password",
      message: "Choose a password different from your current one",
    },
  ])("refuses $why, under that field", async ({ input, field, message }) => {
    const user = userEvent.setup();
    render(<ProfilePassword />);
    await fill(user, input);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText(field)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(field)).toHaveAccessibleDescription(message);
    expect(authClient.changePassword).not.toHaveBeenCalled();
  });

  it("shows every problem at once, not one per attempt", async () => {
    const user = userEvent.setup();
    render(<ProfilePassword />);
    await fill(user, { next: "newpassword456", confirm: "newpassword789" });
    expect(await screen.findByText("Enter your current password")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("says the current password is incorrect when the server rejects it", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: null,
      error: { code: "INVALID_PASSWORD", message: "Invalid password", status: 400 },
    } as never);
    render(<ProfilePassword />);
    await fill(user, { current: "not-it", next: "newpassword456", confirm: "newpassword456" });
    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription(
      "Current password is incorrect.",
    );
    expect(screen.queryByText("Password updated.")).not.toBeInTheDocument();
  });

  it("says so when the change fails for another reason", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: null,
      error: { code: "INTERNAL", message: "boom", status: 500 },
    } as never);
    render(<ProfilePassword />);
    await fill(user, { current: "password123", next: "newpassword456", confirm: "newpassword456" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update your password.");
  });
});
