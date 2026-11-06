import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileMenu } from "@/components/profile-menu";
import { makeQueryClient } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
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
    signOut: vi.fn(async () => ({ data: { success: true }, error: null })),
  },
}));

describe("profile menu", () => {
  it("signs out, forgets the cached data, and goes to sign-in", async () => {
    const user = userEvent.setup();
    const client = makeQueryClient();
    client.setQueryData(["projects"], [{ id: "p1" }]);
    render(
      <QueryClientProvider client={client}>
        <ProfileMenu />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Open profile menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/signin"));
    expect(authClient.signOut).toHaveBeenCalled();
    expect(client.getQueryData(["projects"])).toBeUndefined();
  });
});
