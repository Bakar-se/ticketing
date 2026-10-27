import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Check className="size-4" />
          </div>
          Ticketing
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Plan, track and ship work in one place.
              </h1>
              <p className="text-sm text-muted-foreground">
                Projects, a board, and a backlog for the work your team is
                shipping.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/signin" className={cn(buttonVariants())}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden items-end bg-neutral-950 p-10 lg:flex">
        <p className="text-lg font-medium text-white">
          Plan, track and ship work in one place.
        </p>
      </div>
    </div>
  );
}
