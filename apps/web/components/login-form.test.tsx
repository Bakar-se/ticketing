import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";

const { push, signIn } = vi.hoisted(() => ({
  push: vi.fn(),
  signIn: vi.fn(async () => ({ error: null })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("next=/projects/p1"),
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
  authClient: { signIn: { email: signIn } },
}));

describe("sign in return path", () => {
  it("returns to the project from the invite link", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByPlaceholderText("you@company.com"), "jordan@company.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/p1");
    });
  });
});
