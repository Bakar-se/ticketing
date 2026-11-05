import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectBacklog } from "@/components/project-backlog";
import { ProjectBoard } from "@/components/project-board";
import { ProjectShell } from "@/components/project-shell";
import { TicketChromeProvider } from "@/components/ticket-chrome";
import { TicketPage } from "@/components/ticket-page";
import { TicketView } from "@/components/ticket-view";
import { ApiError, api, makeQueryClient } from "@/lib/api";
import type { Ticket } from "@/lib/tickets";

const { replace, push, route } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  route: {
    params: {} as Record<string, string>,
    pathname: "/projects/p1",
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => route.params,
  usePathname: () => route.pathname,
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
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
      data: { user: { id: "sam", name: "Sam Kim", email: "sam@example.com" } },
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

function projectShellRoutes(
  current: Ticket,
  thread: unknown = comments,
  people: unknown = members,
) {
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
    "/projects/p1/members": people,
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

function renderTicket(
  current = sampleTicket(),
  thread: unknown = comments,
  people: unknown = members,
) {
  route.params = { id: "p1", ticketId: current.id };
  route.pathname = `/projects/p1/tickets/${current.id}`;
  mockGet(projectShellRoutes(current, thread, people));
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

function savedTicket(patch: Partial<Ticket>, current = sampleTicket()) {
  return { data: { ...current, ...patch } };
}

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.delete).mockReset();
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

  it("saves a status change and highlights Backlog", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue(savedTicket({ status: "BACKLOG" }));
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "Backlog" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { status: "BACKLOG" });
    });
    const backlogLinks = screen.getAllByRole("link", { name: "Backlog" });
    expect(backlogLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(
      true,
    );
    const boardLinks = screen.getAllByRole("link", { name: "Board" });
    expect(boardLinks.every((link) => link.getAttribute("aria-current") !== "page")).toBe(
      true,
    );
  });

  it("saves assignee, priority, story points, and due date", async () => {
    const user = userEvent.setup();
    const current = sampleTicket();
    vi.mocked(api.patch).mockImplementation(async (_url, patch) =>
      savedTicket(patch as Partial<Ticket>, current),
    );
    renderTicket(current);
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.click(await screen.findByRole("option", { name: "Sam Kim" }));
    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.click(await screen.findByRole("option", { name: "Unassigned" }));
    await user.click(screen.getByRole("combobox", { name: "Priority" }));
    await user.click(await screen.findByRole("option", { name: "Low" }));
    await user.click(screen.getByRole("combobox", { name: "Story points" }));
    await user.click(await screen.findByRole("option", { name: "8" }));
    await user.click(screen.getByRole("combobox", { name: "Story points" }));
    await user.click(await screen.findByRole("option", { name: "—" }));

    const due = screen.getByLabelText("Due date");
    await user.clear(due);
    await user.type(due, "2026-11-03");
    await user.clear(due);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { assigneeId: "sam" });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { assigneeId: null });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { priority: "LOW" });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { storyPoints: 8 });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { storyPoints: null });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { dueDate: "2026-11-03" });
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { dueDate: null });
    });
  });

  it("saves the title on Enter and when leaving the field", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockImplementation(async (_url, patch) =>
      savedTicket(patch as Partial<Ticket>),
    );
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ticket detail view with comments" }),
    );
    const title = screen.getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "New title{Enter}");
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { title: "New title" });
    });
    expect(screen.getByRole("heading", { name: "New title" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New title" }));
    const again = screen.getByRole("textbox", { name: "Title" });
    await user.clear(again);
    await user.type(again, "Renamed again");
    await user.tab();
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { title: "Renamed again" });
    });
  });

  it("keeps the previous title when the new one is blank", async () => {
    const user = userEvent.setup();
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ticket detail view with comments" }),
    );
    const title = screen.getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "   ");
    await user.tab();

    expect(await screen.findByRole("alert")).toHaveTextContent("Title is required.");
    expect(api.patch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Ticket detail view with comments" }),
    ).toBeInTheDocument();
  });

  it("clears the description", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue(savedTicket({ description: null }));
    renderTicket();
    expect(await screen.findByText("Open a ticket from the board.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open a ticket from the board." }));
    const description = screen.getByRole("textbox", { name: "Description" });
    await user.clear(description);
    await user.tab();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/tickets/t1", { description: null });
    });
    expect(screen.getByRole("button", { name: "No description" })).toBeInTheDocument();
  });

  it("restores the previous value when a save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockRejectedValue(new ApiError(500, "no"));
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "Backlog" }));

    expect(
      await screen.findByText("Couldn't save that change. Please try again."),
    ).toBeInTheDocument();
    const details = screen.getByRole("region", { name: "Details" });
    expect(within(details).getByText("In progress")).toBeInTheDocument();
    const boardLinks = screen.getAllByRole("link", { name: "Board" });
    expect(boardLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(
      true,
    );
  });

  it("posts a comment from the reporter and ignores an empty one", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: "c3",
        body: "Looks good.",
        createdById: "sam",
        createdAt: "2026-10-30T12:00:00.000Z",
      },
    });
    renderTicket();
    expect(await screen.findByRole("heading", { name: "Comments 2" })).toBeInTheDocument();

    const composer = screen.getByRole("textbox", { name: "Write a comment..." });
    const submit = screen.getByRole("button", { name: "Comment" });
    expect(submit).toBeDisabled();
    await user.type(composer, "   ");
    expect(submit).toBeDisabled();
    await user.clear(composer);
    await user.type(composer, "Looks good.");
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/tickets/t1/comments", {
        body: "Looks good.",
      });
    });
    expect(screen.getByRole("heading", { name: "Comments 3" })).toBeInTheDocument();
    const body = screen.getByText("Looks good.");
    const older = screen.getByText("Should the reporter get an email?");
    expect(
      older.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const item = body.closest("li");
    expect(item).toHaveTextContent("Sam Kim");
    expect(item).toHaveTextContent("SK");
    expect(item).toHaveTextContent("now");
    const thread = screen.getByRole("list", { name: "Comments" });
    expect(within(thread).queryByRole("button")).not.toBeInTheDocument();
  });

  it("copies the page link without granting anyone else access", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
    expect(items).toEqual(["Copy link", "Delete"]);
    await user.click(screen.getByRole("menuitem", { name: "Copy link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/projects/p1/tickets/t1",
      );
    });
    expect(screen.getByText("Link copied")).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("says the link could not be copied", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy link" }));
    expect(await screen.findByText("Couldn't copy the link.")).toBeInTheDocument();
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("cancels delete and leaves the ticket in place", async () => {
    const user = userEvent.setup();
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(await screen.findByRole("heading", { name: "Delete ticket" })).toBeInTheDocument();
    expect(screen.getByText("WEB-12 will be deleted, including its comments.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("heading", { name: "Delete ticket" })).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Ticket detail view with comments" }),
    ).toBeInTheDocument();
  });

  it("deletes a board ticket and returns to the board", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockResolvedValue({ data: { id: "t1" } });
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/tickets/t1");
      expect(push).toHaveBeenCalledWith("/projects/p1");
    });
  });

  it("deletes a backlog ticket and returns to the backlog", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockResolvedValue({ data: { id: "t1" } });
    renderTicket(sampleTicket({ status: "BACKLOG" }));
    expect((await screen.findAllByText("WEB-12")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/p1/backlog");
    });
  });

  it("keeps the delete dialog open when delete fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockRejectedValue(new ApiError(500, "no"));
    renderTicket();
    expect(
      await screen.findByRole("heading", {
        name: "Ticket detail view with comments",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText("Couldn't delete that ticket. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete ticket" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        name: "Ticket detail view with comments",
        hidden: true,
      }),
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

  it("shows a former assignee as Unknown", async () => {
    const current = sampleTicket({ assigneeId: "ghost", status: "BACKLOG" });
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
    expect(
      await screen.findByRole("button", { name: "Assignee Unknown. Change assignee" }),
    ).toBeInTheDocument();
  });

  it("hides backlog delete from a member who is not the reporter", async () => {
    const user = userEvent.setup();
    const current = sampleTicket({
      assigneeId: null,
      status: "BACKLOG",
      createdById: "alex",
    });
    route.params = { id: "p1" };
    route.pathname = "/projects/p1/backlog";
    mockGet({
      "/projects/p1/members": [
        { userId: "alex", name: "Alex Doe", email: "alex@example.com", role: "OWNER" },
        { userId: "sam", name: "Sam Kim", email: "sam@example.com", role: "MEMBER" },
      ],
      "/projects/p1/tickets": { items: [current], total: 1 },
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectBacklog />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Actions for WEB-12" }));
    expect(await screen.findByRole("menuitem", { name: "Open" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("hides delete from a member who is not the reporter", async () => {
    const user = userEvent.setup();
    renderTicket(sampleTicket({ createdById: "alex" }));
    expect(
      await screen.findByRole("heading", { name: "Ticket detail view with comments" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    expect(await screen.findByRole("menuitem", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("lets an Owner delete a ticket they did not report", async () => {
    const user = userEvent.setup();
    renderTicket(sampleTicket({ createdById: "alex" }), comments, [
      { userId: "alex", name: "Alex Doe", email: "alex@example.com", role: "MEMBER" },
      { userId: "sam", name: "Sam Kim", email: "sam@example.com", role: "OWNER" },
    ]);
    expect(
      await screen.findByRole("heading", { name: "Ticket detail view with comments" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for WEB-12" }));
    expect(await screen.findByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });
});
