import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSettings } from "@/components/project-settings";
import { api, makeQueryClient } from "@/lib/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  useRouter: () => ({ push }),
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
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe("project settings", () => {
  it("lets an Owner save, archive, and delete", async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Key")).toHaveValue("WEB");
    expect(screen.getByLabelText("Target date")).toHaveValue("2026-12-01");

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Renamed");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/projects/p1", {
        name: "Renamed",
        description: "Ship it",
        targetDate: "2026-12-01",
      });
    });

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(api.patch).toHaveBeenCalledWith("/projects/p1", { archived: true });

    await user.click(screen.getByRole("button", { name: "Delete project" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/projects/p1");
      expect(push).toHaveBeenCalledWith("/projects");
    });
  });

  it("shows a Member the details without the Owner actions", async () => {
    renderSettings({ ...project, role: "MEMBER" });
    expect(await screen.findByLabelText("Name")).toBeDisabled();
    expect(screen.getByLabelText("Key")).toHaveValue("WEB");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();
  });
});
