import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-[13px] text-muted-foreground">
        {/* Year is hard-coded: reading the current date in a server component conflicts with cacheComponents */}
        <span>&copy; 2026 Trackbit</span>
        <nav aria-label="Footer" className="flex gap-2">
          <Link
            href="/signin"
            className="flex min-h-11 items-center px-2 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex min-h-11 items-center px-2 hover:text-foreground"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
