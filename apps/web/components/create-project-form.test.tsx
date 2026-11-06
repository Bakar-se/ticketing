import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectForm } from "@/components/create-project-form";
import { api, makeQueryClient } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

async function fillProject(description: string) {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CreateProjectForm onCreated={onCreated} />
    </QueryClientProvider>,
  );
  await user.type(screen.getByLabelText("Name"), "Web app");
  await user.click(screen.getByLabelText("Description"));
  await user.paste(description);
  await user.click(screen.getByRole("button", { name: "Create project" }));
  return { onCreated };
}

beforeEach(() => {
  vi.mocked(api.post).mockReset();
});

describe("create project form", () => {
  it("accepts a description of 2000 characters, the same limit as editing", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: "p1" } });
    const { onCreated } = await fillProject("a".repeat(2000));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: "p1" }));
    expect(api.post).toHaveBeenCalledWith("/projects", {
      name: "Web app",
      key: "WA",
      description: "a".repeat(2000),
    });
  });

  it("refuses a description over 2000 characters", async () => {
    await fillProject("a".repeat(2001));
    expect(await screen.findByText("Must be 2000 characters or less")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
