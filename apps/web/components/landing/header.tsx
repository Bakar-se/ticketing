import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Check className="size-4" />
      </span>
      Trackbit
    </Link>
  );
}

const links = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6">
      <Logo />
      <nav aria-label="Main" className="flex items-center gap-1">
        {/* Section links hide on small screens; Sign in and Get started stay */}
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="hidden min-h-11 items-center px-3 text-sm text-muted-foreground hover:text-foreground sm:flex"
          >
            {l.label}
          </a>
        ))}
        <Link
          href="/signin"
          className="flex min-h-11 items-center px-3 text-sm font-medium"
        >
          Sign in
        </Link>
        <Link href="/signup" className={buttonVariants({ className: "h-10" })}>
          Get started
        </Link>
      </nav>
    </header>
  );
}
