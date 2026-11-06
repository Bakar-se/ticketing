import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSettings } from "@/components/project-settings";
import { api, makeQueryClient } from "@/lib/api";

const { push, notFound } = vi.hoisted(() => ({ push: vi.fn(), notFound: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  useRouter: () => ({ push }),
  notFound,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

const project = {
  id: "p1",
  key: "WEB",
  name: "Web app",
  description: "Ship it",
  targetDate: "2026-12-01T00:00:00.000Z",
  archivedAt: null as string | null,
  role: "OWNER",
};

function renderSettings(detail = project) {
  vi.mocked(api.get).mockResolvedValue({ data: detail });
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ProjectSettings />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  notFound.mockReset();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe("project settings", () => {
  it("shows an Owner the General card with the key locked", async () => {
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Manage this project.")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toHaveValue("Web app");
    expect(screen.getByLabelText("Project key")).toHaveValue("WEB");
    expect(screen.getByLabelText("Project key")).toBeDisabled();
    expect(
      screen.getByText(
        "Used in ticket IDs, like WEB-12. It can't be changed after the project is created.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Ship it");
    expect(screen.getByLabelText("Target date")).toHaveValue("2026-12-01");
  });

  it("lets an Owner save changes once something has changed", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    renderSettings();
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Renamed");
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/projects/p1", {
        name: "Renamed",
        description: "Ship it",
        targetDate: "2026-12-01",
      });
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("lets an Owner clear the target date", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    renderSettings();
    await user.clear(await screen.findByLabelText("Target date"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/projects/p1", {
        name: "Web app",
        description: "Ship it",
        targetDate: null,
      });
    });
  });

  it("shows a validation error under the field it belongs to", async () => {
    const user = userEvent.setup();
    renderSettings();
    const name = await screen.findByLabelText("Project name");
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required");
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("lets an Owner archive a project from the danger card", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    renderSettings();
    const danger = await screen.findByRole("region", { name: "Danger zone" });
    expect(within(danger).getByRole("heading", { name: "Archive project" })).toBeInTheDocument();
    await user.click(within(danger).getByRole("button", { name: "Archive project" }));
    expect(api.patch).toHaveBeenCalledWith("/projects/p1", { archived: true });
  });

  it("offers Restore for an archived project", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    renderSettings({ ...project, archivedAt: "2026-11-01T00:00:00.000Z" });
    const danger = await screen.findByRole("region", { name: "Danger zone" });
    expect(
      within(danger).queryByRole("button", { name: "Archive project" }),
    ).not.toBeInTheDocument();
    await user.click(within(danger).getByRole("button", { name: "Restore project" }));
    expect(api.patch).toHaveBeenCalledWith("/projects/p1", { archived: false });
  });

  it("deletes only after the Owner types the project name, then goes to the projects list", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    renderSettings();
    const danger = await screen.findByRole("region", { name: "Danger zone" });
    expect(
      within(danger).getByText(
        "Permanently delete this project and all of its tickets. This can't be undone.",
      ),
    ).toBeInTheDocument();
    await user.click(within(danger).getByRole("button", { name: "Delete project" }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Type the project name to confirm"), "Web app");
    await user.click(within(dialog).getByRole("button", { name: "Delete project" }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/projects/p1");
      expect(push).toHaveBeenCalledWith("/projects");
    });
    // The deleted project is never asked for again, so no "Project not found" flash
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => url === "/projects/p1")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Project not found" })).not.toBeInTheDocument();
  });

  it("turns Archive into Restore once the project is archived", async () => {
    const user = userEvent.setup();
    let current = { ...project };
    vi.mocked(api.get).mockImplementation(async () => ({ data: current }));
    vi.mocked(api.patch).mockImplementation(async (_url, body) => {
      const archivedNow = (body as { archived: boolean }).archived;
      current = { ...current, archivedAt: archivedNow ? "2026-11-06T00:00:00.000Z" : null };
      return { data: current };
    });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectSettings />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Archive project" }));
    await user.click(await screen.findByRole("button", { name: "Restore project" }));
    expect(await screen.findByRole("button", { name: "Archive project" })).toBeInTheDocument();
    expect(api.patch).toHaveBeenLastCalledWith("/projects/p1", { archived: false });
  });

  it("gives a Member not-found instead of the settings", async () => {
    renderSettings({ ...project, role: "MEMBER" });
    await waitFor(() => expect(notFound).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Web app")).not.toBeInTheDocument();
  });
});
