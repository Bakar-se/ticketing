import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectsScreen } from "@/components/projects-screen";
import { api, makeQueryClient } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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
      data: { user: { id: "alex", name: "Alex Doe", email: "alex@company.com" } },
      isPending: false,
    }),
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

const active = {
  id: "p1",
  key: "WEB",
  name: "Web app",
  description: null,
  updatedAt: "2026-10-30T12:00:00.000Z",
  role: "MEMBER",
  counts: { backlog: 2, todo: 0, inProgress: 0, done: 1 },
};

const archived = {
  ...active,
  id: "p2",
  name: "Old app",
  role: "OWNER",
};

describe("projects list", () => {
  it("hides delete for a Member and lists an archived project the Owner can delete", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockImplementation(async (url: string, config) => {
      const archivedView =
        (config?.params as { archived?: string } | undefined)?.archived === "true";
      if (url === "/projects" && archivedView) return { data: [archived] };
      if (url === "/projects") return { data: [active] };
      throw new Error(url);
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectsScreen />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Web app")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Web app" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByText("Old app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Old app" })).toBeInTheDocument();
  });

  it("asks for the project name before deleting from the list", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockImplementation(async (url: string, config) => {
      const archivedView =
        (config?.params as { archived?: string } | undefined)?.archived === "true";
      if (url === "/projects") return { data: archivedView ? archivedList : [active] };
      throw new Error(url);
    });
    let archivedList = [archived];
    vi.mocked(api.delete).mockImplementation(async () => {
      archivedList = [];
      return { data: {} };
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectsScreen />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Archived" }));
    await user.click(await screen.findByRole("button", { name: "Delete Old app" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Delete Old app?" })).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Delete project" });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Type the project name to confirm"), "Old app");
    await user.click(confirm);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/projects/p2"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Old app")).not.toBeInTheDocument());
  });
});
