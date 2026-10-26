import { authClient } from "./auth-client";

const API = process.env.EXPO_PUBLIC_API_URL!;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Native apps have no browser cookie jar, so we attach the stored session cookie ourselves.
  // The api's guard already forwards the Cookie header to the auth service.
  const cookie = await authClient.getCookie();
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "omit",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
