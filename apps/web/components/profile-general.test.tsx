import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileGeneral } from "@/components/profile-general";
import { api, makeQueryClient } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const session = vi.hoisted(() => ({
  user: {
    id: "alex",
    name: "Alex Doe",
    email: "alex@company.com",
    phone: null as string | null,
    emailVerified: true,
  },
}));
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => search.params,
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
    useSession: () => ({ data: { user: session.user }, isPending: false }),
    updateUser: vi.fn(),
    sendVerificationEmail: vi.fn(),
    changeEmail: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

function renderProfile(
  phone: string | null = null,
  {
    emailVerified = true,
    query = "",
    email = "alex@company.com",
  }: { emailVerified?: boolean; query?: string; email?: string } = {},
) {
  session.user = { ...session.user, phone, emailVerified, email };
  search.params = new URLSearchParams(query);
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ProfileGeneral />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(authClient.updateUser).mockReset();
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: { status: true }, error: null } as never);
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockResolvedValue({ data: [] });
  vi.mocked(authClient.sendVerificationEmail).mockReset();
  vi.mocked(authClient.sendVerificationEmail).mockResolvedValue({
    data: { status: true },
    error: null,
  } as never);
});

describe("email verification", () => {
  it("tells an unverified person and sends them a link back to their profile", async () => {
    const user = userEvent.setup();
    renderProfile(null, { emailVerified: false });
    expect(screen.getByText("Not verified.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send verification email" }));
    await waitFor(() =>
      expect(authClient.sendVerificationEmail).toHaveBeenCalledWith({
        email: "alex@company.com",
        callbackURL: `${window.location.origin}/profile?verified=1`,
      }),
    );
    expect(await screen.findByText("We've sent a link to alex@company.com.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send verification email" })).not.toBeInTheDocument();
  });

  it("offers nothing to verify once the email is verified", () => {
    renderProfile(null, { emailVerified: true });
    expect(screen.queryByText("Not verified.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send verification email" })).not.toBeInTheDocument();
  });

  it("confirms the email after the person follows the link", () => {
    renderProfile(null, { emailVerified: true, query: "verified=1" });
    expect(screen.getByText("Your email is verified.")).toHaveAttribute("role", "status");
  });

  it("says so when the link can't be sent", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.sendVerificationEmail).mockResolvedValue({
      data: null,
      error: { message: "boom", status: 500 },
    } as never);
    renderProfile(null, { emailVerified: false });
    await user.click(screen.getByRole("button", { name: "Send verification email" }));
    expect(await screen.findByText("Couldn't send the link. Try again in a moment.")).toBeInTheDocument();
  });
});

describe("changing email", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(authClient.changeEmail).mockReset();
    vi.mocked(authClient.changeEmail).mockResolvedValue({
      data: { status: true },
      error: null,
    } as never);
  });

  async function startChange(user: ReturnType<typeof userEvent.setup>, newEmail: string) {
    await user.click(screen.getByRole("button", { name: "Change email" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("New email"), newEmail);
    await user.click(within(dialog).getByRole("button", { name: "Send approval link" }));
    return dialog;
  }

  it("only lets a verified address change", () => {
    renderProfile(null, { emailVerified: false });
    expect(screen.queryByRole("button", { name: "Change email" })).not.toBeInTheDocument();
    expect(screen.getByText("Verify your email before you can change it.")).toBeInTheDocument();
  });

  it("asks the current address to approve, then the new one to confirm", async () => {
    const user = userEvent.setup();
    renderProfile();
    const dialog = await startChange(user, "alexandra@company.com");
    await waitFor(() =>
      expect(authClient.changeEmail).toHaveBeenCalledWith({
        newEmail: "alexandra@company.com",
        callbackURL: `${window.location.origin}/profile?emailChange=1`,
      }),
    );
    expect(
      await within(dialog).findByText(
        "We've emailed alex@company.com. Approve the change there, then confirm the new address.",
      ),
    ).toBeInTheDocument();
  });

  it("refuses an address that isn't an email, or is already theirs", async () => {
    const user = userEvent.setup();
    renderProfile();
    const dialog = await startChange(user, "not-an-email");
    expect(await within(dialog).findByText("Enter a valid email")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("New email")).toHaveAccessibleDescription(
      "Enter a valid email",
    );

    await user.clear(within(dialog).getByLabelText("New email"));
    await user.type(within(dialog).getByLabelText("New email"), "Alex@Company.com");
    await user.click(within(dialog).getByRole("button", { name: "Send approval link" }));
    expect(await within(dialog).findByText("That's already your email")).toBeInTheDocument();
    expect(authClient.changeEmail).not.toHaveBeenCalled();
  });

  it("says so when the change can't be started", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.changeEmail).mockResolvedValue({
      data: null,
      error: { message: "boom", status: 500 },
    } as never);
    renderProfile();
    const dialog = await startChange(user, "alexandra@company.com");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Couldn't start the change. Try again in a moment.",
    );
  });

  it("tells the person to finish at the new address after they approve", async () => {
    const user = userEvent.setup();
    renderProfile();
    await startChange(user, "alexandra@company.com");
    await screen.findByText(/We've emailed alex@company.com/);
    cleanup();

    // The approval link lands back here; the email hasn't changed yet
    renderProfile(null, { query: "emailChange=1" });
    expect(
      screen.getByText("Change approved. Open the link we sent to alexandra@company.com to finish."),
    ).toHaveAttribute("role", "status");
  });

  it("confirms the new email after the last link", async () => {
    const user = userEvent.setup();
    renderProfile();
    await startChange(user, "alexandra@company.com");
    await screen.findByText(/We've emailed alex@company.com/);
    cleanup();

    renderProfile(null, { query: "emailChange=1", email: "alexandra@company.com" });
    expect(screen.getByText("Your email is now alexandra@company.com.")).toHaveAttribute(
      "role",
      "status",
    );
    // Any API request carries the new session, which updates the member copies
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/projects"));
  });

  it("stays accurate when this browser didn't start the change", () => {
    renderProfile(null, { query: "emailChange=1" });
    expect(
      screen.getByText(
        "Your email is alex@company.com. If you're changing it, finish with the link we sent to the new address.",
      ),
    ).toHaveAttribute("role", "status");
  });

  it("says when an email-change link has expired or was already used", () => {
    renderProfile(null, { query: "emailChange=1&error=TOKEN_EXPIRED" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That link has expired or was already used. Start again with Change email.",
    );
    expect(screen.queryByText(/Change approved/)).not.toBeInTheDocument();
  });

  it("says when a verification link has expired or was already used", () => {
    renderProfile(null, { emailVerified: false, query: "verified=1&error=TOKEN_EXPIRED" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That link has expired or was already used. Send yourself a new one below.",
    );
  });
});

describe("profile general tab", () => {
  it("shows the person's details with the email locked", async () => {
    renderProfile("+15550000000");
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Manage your personal information.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("main")).getByText("AD")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Password" })).toHaveAttribute(
      "href",
      "/profile/password",
    );
    expect(screen.getByRole("link", { name: "Password" })).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Full name")).toHaveValue("Alex Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("alex@company.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Change email" })).toBeInTheDocument();
    expect(screen.queryByText("Contact support to change your email.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toHaveValue("+15550000000");
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription(
      "Optional. Include the country code.",
    );
  });

  it("saves a new name once something has changed, then refreshes the team copies", async () => {
    const user = userEvent.setup();
    renderProfile();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Alexandra Doe");
    await user.click(save);

    await waitFor(() =>
      expect(authClient.updateUser).toHaveBeenCalledWith({ name: "Alexandra Doe", phone: null }),
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    // Any API request carries the new session, which updates the member copies
    expect(api.get).toHaveBeenCalledWith("/projects");
    expect(save).toBeDisabled();
  });

  it("saves a phone number without its spaces", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.type(screen.getByLabelText("Phone"), "+44 20 7123 4567");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(authClient.updateUser).toHaveBeenCalledWith({
        name: "Alex Doe",
        phone: "+442071234567",
      }),
    );
  });

  it("clears the phone number when it is saved empty", async () => {
    const user = userEvent.setup();
    renderProfile("+15550000000");
    await user.clear(screen.getByLabelText("Phone"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(authClient.updateUser).toHaveBeenCalledWith({ name: "Alex Doe", phone: null }),
    );
  });

  it("refuses a phone number without a country code, under the field", async () => {
    const user = userEvent.setup();
    renderProfile();
    const phone = screen.getByLabelText("Phone");
    await user.type(phone, "555 0000");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const message = "Enter the number with its country code, like +1 555 000 0000";
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAccessibleDescription(message);
    expect(authClient.updateUser).not.toHaveBeenCalled();
  });

  it("puts the saved details back on Cancel", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Someone else");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Alex Doe");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("says so when the save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.updateUser).mockResolvedValue({
      data: null,
      error: { message: "Something broke", status: 500 },
    } as never);
    renderProfile();
    await user.type(screen.getByLabelText("Full name"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your profile.");
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});
