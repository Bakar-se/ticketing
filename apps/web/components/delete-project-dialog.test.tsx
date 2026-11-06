import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { ApiError, api, makeQueryClient } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

const project = { id: "p1", name: "Web app" };

function renderDialog() {
  const onDeleted = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <DeleteProjectDialog project={project} onClose={onClose} onDeleted={onDeleted} />
    </QueryClientProvider>,
  );
  return { onDeleted, onClose };
}

beforeEach(() => {
  vi.mocked(api.delete).mockReset();
  vi.mocked(api.delete).mockResolvedValue({ data: {} });
});

describe("delete project dialog", () => {
  it("asks for the project name before it will delete", () => {
    renderDialog();
    expect(screen.getByRole("heading", { name: "Delete Web app?" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "This permanently deletes the project and all of its tickets and comments. This can't be undone.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Type the project name to confirm")).toHaveAttribute(
      "placeholder",
      "Web app",
    );
    expect(screen.getByRole("button", { name: "Delete project" })).toBeDisabled();
  });

  it.each(["Web", "web app", "Web app!"])("stays disabled for %j", async (typed) => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Type the project name to confirm"), typed);
    expect(screen.getByRole("button", { name: "Delete project" })).toBeDisabled();
  });

  it("deletes once the exact name is typed, ignoring surrounding spaces", async () => {
    const user = userEvent.setup();
    const { onDeleted } = renderDialog();
    await user.type(screen.getByLabelText("Type the project name to confirm"), "  Web app ");
    await user.click(screen.getByRole("button", { name: "Delete project" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(api.delete).toHaveBeenCalledWith("/projects/p1");
  });

  it("closes on Cancel without deleting", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("stays open and says so when the delete fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockRejectedValue(new ApiError(500, "boom"));
    const { onDeleted } = renderDialog();
    await user.type(screen.getByLabelText("Type the project name to confirm"), "Web app");
    await user.click(screen.getByRole("button", { name: "Delete project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete this project.");
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
