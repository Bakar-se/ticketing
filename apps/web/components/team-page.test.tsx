import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectShell } from "@/components/project-shell";
import { TeamPage } from "@/components/team-page";
import { TicketChromeProvider } from "@/components/ticket-chrome";
import { api, makeQueryClient } from "@/lib/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const session = vi.hoisted(() => ({
  user: { id: "alex", name: "Alex Doe", email: "alex@company.com" },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  usePathname: () => "/projects/p1/team",
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: session.user }, isPending: false }),
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const team = {
  members: [
    {
      userId: "alex",
      name: "Alex Doe",
      email: "alex@company.com",
      role: "OWNER",
      joinedAt: "2026-10-14T12:00:00.000Z",
    },
    {
      userId: "sam",
      name: "Sam Kim",
      email: "sam@company.com",
      role: "MEMBER",
      joinedAt: "2026-10-16T12:00:00.000Z",
    },
  ],
  invites: [
    {
      id: "inv1",
      email: "jordan@company.com",
      sentAt: "2026-10-22T12:00:00.000Z",
      expiresAt: "2099-10-29T12:00:00.000Z",
      sendFailed: false,
    },
  ],
};

function renderTeam(next = team) {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === "/projects/p1") {
      return { data: { id: "p1", key: "WEB", name: "Web app" } };
    }
    if (url === "/projects") {
      return {
        data: [
          {
            id: "p1",
            key: "WEB",
            name: "Web app",
            description: null,
            updatedAt: "2026-10-22T12:00:00.000Z",
            role: "OWNER",
            counts: { backlog: 0, todo: 0, inProgress: 0, done: 0 },
          },
        ],
      };
    }
    if (url === "/projects/p1/team") return { data: next };
    throw new Error(url);
  });
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TicketChromeProvider>
        <ProjectShell>
          <TeamPage />
        </ProjectShell>
      </TicketChromeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  session.user = { id: "alex", name: "Alex Doe", email: "alex@company.com" };
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe("team page", () => {
  it("shows members, a pending invite, and the project name", async () => {
    renderTeam();
    expect(await screen.findByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByText("People with access to Web app.")).toBeInTheDocument();
    expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    expect(screen.getByText("alex@company.com")).toBeInTheDocument();
    expect(screen.getByText("Oct 14")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("jordan@company.com")).toBeInTheDocument();
    expect(screen.getByText("Invite sent Oct 22")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite member" })).toBeInTheDocument();
  });

  it("filters members by name and invites by email", async () => {
    const user = userEvent.setup();
    renderTeam();
    const search = await screen.findByRole("textbox", { name: "Search members" });
    await user.type(search, "sam");
    expect(screen.getByText("Sam Kim")).toBeInTheDocument();
    expect(screen.queryByText("Alex Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("jordan@company.com")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "JORDAN@");
    expect(screen.getByText("jordan@company.com")).toBeInTheDocument();
    expect(screen.queryByText("Sam Kim")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nobody");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("sends an invite and refuses a bad email", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { id: "inv2" } });
    renderTeam();
    await user.click(await screen.findByRole("button", { name: "Invite member" }));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(api.post).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "new@company.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/projects/p1/invites", {
        email: "new@company.com",
      });
    });
  });

  it("resends, cancels, changes a role, and removes a member", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    renderTeam();
    await screen.findByText("jordan@company.com");

    await user.click(screen.getByRole("button", { name: "Actions for jordan@company.com" }));
    await user.click(await screen.findByRole("menuitem", { name: "Resend" }));
    expect(api.post).toHaveBeenCalledWith("/projects/p1/invites/inv1/resend");

    await user.click(screen.getByRole("button", { name: "Actions for jordan@company.com" }));
    await user.click(await screen.findByRole("menuitem", { name: "Cancel" }));
    expect(api.delete).toHaveBeenCalledWith("/projects/p1/invites/inv1");

    await user.click(screen.getByRole("button", { name: "Actions for Sam Kim" }));
    await user.click(await screen.findByRole("menuitem", { name: "Make owner" }));
    expect(api.patch).toHaveBeenCalledWith("/projects/p1/members/sam", {
      role: "OWNER",
    });

    await user.click(screen.getByRole("button", { name: "Actions for Sam Kim" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
    expect(
      screen.getByText(
        "Sam Kim will lose access. Tickets assigned to them will become unassigned.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/projects/p1/members/sam");
    });
  });

  it("marks an expired invite and a send failure", async () => {
    renderTeam({
      ...team,
      invites: [
        {
          ...team.invites[0],
          expiresAt: "2020-01-01T00:00:00.000Z",
          sendFailed: true,
        },
      ],
    });
    expect(await screen.findByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Couldn't send email")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("lets a Member see the team and leave, without managing other people", async () => {
    const user = userEvent.setup();
    session.user = { id: "sam", name: "Sam Kim", email: "sam@company.com" };
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    renderTeam();
    expect(await screen.findByText("Alex Doe")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Alex Doe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for jordan@company.com" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for Sam Kim" }));
    await user.click(await screen.findByRole("menuitem", { name: "Leave" }));
    await user.click(screen.getByRole("button", { name: "Leave" }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/projects/p1/leave");
      expect(push).toHaveBeenCalledWith("/projects");
    });
  });

  it("does not offer the last Owner a way to leave", async () => {
    renderTeam({
      members: [team.members[0]],
      invites: [],
    });
    expect(await screen.findByText("Alex Doe")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Alex Doe" }),
    ).not.toBeInTheDocument();
  });
});
