import { NextResponse, type NextRequest } from "next/server";

const AUTH_URL =
  process.env.AUTH_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_AUTH_URL ??
  "http://localhost:4001";
const PUBLIC_PATHS = ["/signin", "/signup"];

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
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (authenticated && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and files with an extension (images, favicon, fonts)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
