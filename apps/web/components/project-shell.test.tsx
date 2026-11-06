import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectShell } from "@/components/project-shell";
import { TicketChromeProvider } from "@/components/ticket-chrome";
import { api, makeQueryClient } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  usePathname: () => "/projects/p1",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
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

function renderShell(role: "OWNER" | "MEMBER") {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === "/projects/p1") {
      return { data: { id: "p1", key: "WEB", name: "Web app", role } };
    }
    if (url === "/projects") return { data: [] };
    throw new Error(url);
  });
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TicketChromeProvider>
        <ProjectShell>
          <p>Board</p>
        </ProjectShell>
      </TicketChromeProvider>
    </QueryClientProvider>,
  );
}

describe("project navigation", () => {
  it("offers Settings to an Owner", async () => {
    renderShell("OWNER");
    expect(await screen.findByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/projects/p1/settings",
    );
  });

  it("does not offer Settings to a Member", async () => {
    renderShell("MEMBER");
    expect(await screen.findByRole("link", { name: "Team" })).toBeInTheDocument();
    // Wait until the project, and so the role, has loaded
    expect(await screen.findAllByText("Web app")).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });
});
