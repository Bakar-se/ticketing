const API = process.env.NEXT_PUBLIC_API_URL;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include", // the api reads the session cookie
    headers: init.body ? { "Content-Type": "application/json" } : {},
  });
  if (res.status === 401) {
    window.location.href = "/signin";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const issues = Array.isArray(err.issues)
      ? err.issues
          .map(
            (i: { path: string; message: string }) => `${i.path}: ${i.message}`,
          )
          .join(", ")
      : "";
    throw new Error(issues || err.message || res.statusText);
  }
  return res.json();
}
