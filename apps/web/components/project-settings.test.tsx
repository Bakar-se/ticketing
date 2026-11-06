import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
  archivedAt: null,
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

  it("lets an Owner archive and delete", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    renderSettings();

    await user.click(await screen.findByRole("button", { name: "Archive" }));
    expect(api.patch).toHaveBeenCalledWith("/projects/p1", { archived: true });

    await user.click(screen.getByRole("button", { name: "Delete project" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/projects/p1");
      expect(push).toHaveBeenCalledWith("/projects");
    });
  });

  it("gives a Member not-found instead of the settings", async () => {
    renderSettings({ ...project, role: "MEMBER" });
    await waitFor(() => expect(notFound).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Web app")).not.toBeInTheDocument();
  });
});
