export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(value, "http://trackbit.local");
  } catch {
    return null;
  }
  if (url.origin !== "http://trackbit.local") return null;
  return `${url.pathname}${url.search}`;
}
