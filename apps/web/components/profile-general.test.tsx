import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
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
    useSession: () => ({ data: { user: session.user }, isPending: false }),
    updateUser: vi.fn(),
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

function renderProfile(phone: string | null = null) {
  session.user = { ...session.user, phone };
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
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Contact support to change your email.",
    );
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
