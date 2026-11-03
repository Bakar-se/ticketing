import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectBacklog } from "@/components/project-backlog";
import { ProjectBoard } from "@/components/project-board";
import { ProjectShell } from "@/components/project-shell";
import { TicketChromeProvider } from "@/components/ticket-chrome";
import { TicketPage } from "@/components/ticket-page";
import { TicketView } from "@/components/ticket-view";
import { ApiError, api, makeQueryClient } from "@/lib/api";
import type { Ticket } from "@/lib/tickets";

const { replace, route } = vi.hoisted(() => ({
  replace: vi.fn(),
  route: {
    params: {} as Record<string, string>,
    pathname: "/projects/p1",
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => route.params,
  usePathname: () => route.pathname,
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
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
    useSession: () => ({
      data: { user: { name: "Sam Kim", email: "sam@example.com" } },
      isPending: false,
    }),
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

const NOW = new Date("2026-10-30T12:00:00Z").getTime();
const members = [
  { userId: "alex", name: "Alex Doe", email: "alex@example.com" },
  { userId: "sam", name: "Sam Kim", email: "sam@example.com" },
];

function sampleTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "t1",
    ticketKey: "WEB-12",
    title: "Ticket detail view with comments",
    description: "Open a ticket from the board.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    storyPoints: 5,
    dueDate: "2026-10-27",
    assigneeId: "alex",
    position: 0,
    projectId: "p1",
    createdById: "sam",
    createdAt: "2026-10-18T08:00:00.000Z",
    updatedAt: "2026-10-30T10:00:00.000Z",
    ...overrides,
  };
}

const comments = [
  {
    id: "c1",
    body: "Started on the layout.",
    createdById: "sam",
    createdAt: "2026-10-30T10:00:00.000Z",
  },
  {
    id: "c2",
    body: "Should the reporter get an email?",
    createdById: "alex",
    createdAt: "2026-10-30T11:00:00.000Z",
  },
];

function projectShellRoutes(current: Ticket, thread: unknown = comments) {
  return {
    "/projects/p1": { id: "p1", key: "WEB", name: "Web app" },
    "/projects": [
      {
        id: "p1",
        key: "WEB",
        name: "Web app",
        description: null,
        updatedAt: current.updatedAt,
        counts: { backlog: 0, todo: 0, inProgress: 1, done: 0 },
      },
    ],
    [`/tickets/${current.id}`]: current,
    [`/tickets/${current.id}/comments`]: thread,
    "/projects/p1/members": members,
  } as Record<string, unknown>;
}

function mockGet(routes: Record<string, unknown>) {
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === "/projects/p1/tickets") {
      const page = routes[url] as
        { items: Ticket[]; total: number } | undefined;
      if (!page) throw new ApiError(404, "missing");
      const status = (config?.params as { status?: string } | undefined)
        ?.status;
      const items = status
        ? page.items.filter((item) => item.status === status)
        : page.items;
      return { data: { items, total: items.length } };
    }
    if (!(url in routes)) throw new ApiError(404, "missing");
    const body = routes[url];
    if (body instanceof Error) throw body;
    return { data: body };
  });
}

function renderTicket(current = sampleTicket(), thread: unknown = comments) {
  route.params = { id: "p1", ticketId: current.id };
  route.pathname = `/projects/p1/tickets/${current.id}`;
  mockGet(projectShellRoutes(current, thread));
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TicketChromeProvider>
        <ProjectShell>
          <TicketPage />
        </ProjectShell>
      </TicketChromeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

describe("ticket page", () => {
  it("shows the ticket, its details, and a separate comment request", async () => {
    renderTicket();

    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("WEB-12").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Open a ticket from the board."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch project" }),
    ).toBeInTheDocument();

    const details = screen.getByRole("region", { name: "Details" });
    const text = details.textContent ?? "";
    const labels = [
      "Status",
      "Assignee",
      "Reporter",
      "Priority",
      "Story points",
      "Due date",
      "Created",
      "Updated",
    ];
    let last = -1;
    for (const label of labels) {
      const index = text.indexOf(label);
      expect(index).toBeGreaterThan(last);
      last = index;
    }
    expect(within(details).getByText("In progress")).toBeInTheDocument();
    expect(within(details).getByText("Alex Doe")).toBeInTheDocument();
    expect(within(details).getByText("AD")).toBeInTheDocument();
    expect(within(details).getByText("Sam Kim")).toBeInTheDocument();
    expect(within(details).getByText("SK")).toBeInTheDocument();
    expect(within(details).getByText("High")).toBeInTheDocument();
    expect(within(details).getByText("5")).toBeInTheDocument();
    expect(within(details).getByText("Oct 27")).toBeInTheDocument();
    expect(within(details).getByText("Oct 18")).toBeInTheDocument();
    expect(within(details).getByText("2 hours ago")).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "Comments 2" }),
    ).toBeInTheDocument();
    const older = screen.getByText("Started on the layout.");
    const newer = screen.getByText("Should the reporter get an email?");
    expect(
      older.compareDocumentPosition(newer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("1 hour ago")).toBeInTheDocument();

    const urls = vi.mocked(api.get).mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("/tickets/t1");
    expect(urls).toContain("/tickets/t1/comments");
    expect(urls).toContain("/projects/p1/members");
  });

  it("shows the ticket before comments finish loading", async () => {
    let release: (thread: typeof comments) => void = () => {};
    const pending = new Promise<typeof comments>((resolve) => {
      release = resolve;
    });
    route.params = { id: "p1", ticketId: "t1" };
    route.pathname = "/projects/p1/tickets/t1";
    const routes = projectShellRoutes(sampleTicket(), comments);
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/tickets/t1/comments") return { data: await pending };
      if (!(url in routes)) throw new ApiError(404, "missing");
      return { data: routes[url] };
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TicketChromeProvider>
          <ProjectShell>
            <TicketPage />
          </ProjectShell>
        </TicketChromeProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Started on the layout."),
    ).not.toBeInTheDocument();
    release(comments);
    expect(
      await screen.findByText("Started on the layout."),
    ).toBeInTheDocument();
  });

  it("shows empty description, assignee, points, date, and comment count", async () => {
    renderTicket(
      sampleTicket({
        description: null,
        assigneeId: null,
        storyPoints: null,
        dueDate: null,
      }),
      [],
    );

    expect(await screen.findByText("No description")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("No date")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Comments 0" }),
    ).toBeInTheDocument();
  });

  it("shows Unknown when a person is not a project member", async () => {
    renderTicket(sampleTicket({ assigneeId: "ghost" }), [
      {
        id: "c1",
        body: "A note from someone who left.",
        createdById: "ghost",
        createdAt: "2026-10-30T11:30:00.000Z",
      },
    ]);

    expect(
      await screen.findByText("A note from someone who left."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("highlights Board and links the breadcrumb for an in-progress ticket", async () => {
    renderTicket(sampleTicket({ status: "IN_PROGRESS" }));
    expect((await screen.findAllByText("WEB-12")).length).toBeGreaterThan(0);

    const crumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(crumb).getByRole("link", { name: "Projects" }),
    ).toHaveAttribute("href", "/projects");
    expect(
      within(crumb).getByRole("link", { name: "Web app" }),
    ).toHaveAttribute("href", "/projects/p1");
    expect(within(crumb).getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/projects/p1",
    );
    expect(within(crumb).getByText("WEB-12").closest("a")).toBeNull();

    const boardLinks = screen.getAllByRole("link", { name: "Board" });
    expect(
      boardLinks.some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    const backlogLinks = screen.getAllByRole("link", { name: "Backlog" });
    expect(
      backlogLinks.every(
        (link) => link.getAttribute("aria-current") !== "page",
      ),
    ).toBe(true);
  });

  it.each(["TODO", "DONE"] as const)(
    "highlights Board when the status is %s",
    async (status) => {
      renderTicket(sampleTicket({ status }));
      expect((await screen.findAllByText("WEB-12")).length).toBeGreaterThan(0);
      const boardLinks = screen.getAllByRole("link", { name: "Board" });
      expect(
        boardLinks.some((link) => link.getAttribute("aria-current") === "page"),
      ).toBe(true);
    },
  );

  it("highlights Backlog when the ticket is in the backlog", async () => {
    renderTicket(sampleTicket({ status: "BACKLOG" }));
    expect((await screen.findAllByText("WEB-12")).length).toBeGreaterThan(0);

    const crumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(crumb).getByRole("link", { name: "Backlog" }),
    ).toHaveAttribute("href", "/projects/p1/backlog");
    const backlogLinks = screen.getAllByRole("link", { name: "Backlog" });
    expect(
      backlogLinks.some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  it("keeps the section breadcrumb on board, backlog, team, and settings", async () => {
    const cases = [
      ["/projects/p1", "Board"],
      ["/projects/p1/backlog", "Backlog"],
      ["/projects/p1/team", "Team"],
      ["/projects/p1/settings", "Settings"],
    ] as const;

    for (const [pathname, label] of cases) {
      route.params = { id: "p1" };
      route.pathname = pathname;
      mockGet(projectShellRoutes(sampleTicket()));
      const view = render(
        <QueryClientProvider client={makeQueryClient()}>
          <TicketChromeProvider>
            <ProjectShell>
              <p>{label} section</p>
            </ProjectShell>
          </TicketChromeProvider>
        </QueryClientProvider>,
      );
      const crumb = await screen.findByRole("navigation", {
        name: "Breadcrumb",
      });
      expect(await within(crumb).findByText("Web app")).toBeInTheDocument();
      expect(within(crumb).getByText(label).closest("a")).toBeNull();
      expect(within(crumb).queryByText("WEB-12")).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("says the ticket was not found inside the project when it belongs elsewhere", async () => {
    renderTicket(sampleTicket({ projectId: "other" }));
    expect(
      await screen.findByRole("heading", { name: "Ticket not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch project" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("WEB-12")).not.toBeInTheDocument();
  });

  it("says the ticket was not found inside the project when the request is missing", async () => {
    route.params = { id: "p1", ticketId: "missing" };
    route.pathname = "/projects/p1/tickets/missing";
    mockGet({
      ...projectShellRoutes(sampleTicket()),
      "/tickets/missing": new ApiError(404, "Ticket not found"),
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TicketChromeProvider>
          <ProjectShell>
            <TicketPage />
          </ProjectShell>
        </TicketChromeProvider>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Ticket not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch project" }),
    ).toBeInTheDocument();
  });
});

describe("old ticket url", () => {
  it("moves a found ticket to the project page", async () => {
    route.params = { id: "t1" };
    route.pathname = "/tickets/t1";
    mockGet({ "/tickets/t1": sampleTicket() });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TicketView />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/projects/p1/tickets/t1");
    });
    expect(
      screen.queryByRole("button", { name: "Switch project" }),
    ).not.toBeInTheDocument();
  });

  it("says the ticket was not found without the project sidebar", async () => {
    route.params = { id: "missing" };
    route.pathname = "/tickets/missing";
    mockGet({ "/tickets/missing": new ApiError(404, "Ticket not found") });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TicketView />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Ticket not found" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Switch project" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Breadcrumb" }),
    ).not.toBeInTheDocument();
  });
});

describe("ticket links", () => {
  it("opens a board ticket on the project ticket page", async () => {
    const current = sampleTicket({ status: "TODO" });
    route.params = { id: "p1" };
    route.pathname = "/projects/p1";
    mockGet({
      "/projects/p1": { name: "Web app" },
      "/projects/p1/tickets": { items: [current], total: 1 },
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectBoard />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole("link", { name: "WEB-12" });
    expect(link).toHaveAttribute("href", "/projects/p1/tickets/t1");
  });

  it("opens a backlog ticket on the project ticket page", async () => {
    const current = sampleTicket({ status: "BACKLOG" });
    route.params = { id: "p1" };
    route.pathname = "/projects/p1/backlog";
    mockGet({
      "/projects/p1/members": members,
      "/projects/p1/tickets": { items: [current], total: 1 },
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectBacklog />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole("link", { name: "WEB-12" });
    expect(link).toHaveAttribute("href", "/projects/p1/tickets/t1");
  });
});
