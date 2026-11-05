import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "./lib/return-path";

const AUTH_URL = process.env.AUTH_INTERNAL_URL ?? "http://localhost:4001";
const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
];
const AUTH_ENTRY_PATHS = ["/", "/signin", "/signup"];

// Ask the auth service whether this cookie is a real, unexpired session
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { user?: unknown } | null;
    return Boolean(body?.user);
  } catch {
    return false; // auth service unreachable: fail closed
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const authenticated = await hasValidSession(request);

  if (!authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    const dest = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/signin";
    url.search = `?next=${encodeURIComponent(dest)}`;
    return NextResponse.redirect(url);
  }
  if (authenticated && AUTH_ENTRY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    const next = safeNextPath(url.searchParams.get("next"));
    if (!next) {
      url.pathname = "/projects";
      url.search = "";
      return NextResponse.redirect(url);
    }
    const target = new URL(next, "http://trackbit.local");
    url.pathname = target.pathname;
    url.search = target.search;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and files with an extension (images, favicon, fonts)
  matcher: ["/((?!api/auth|backend|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
