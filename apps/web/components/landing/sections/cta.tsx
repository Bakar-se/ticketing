import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const wrap = "mx-auto w-full max-w-[1120px] px-6";

export function Cta() {
  return (
    <section className={`${wrap} pb-20`}>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground">
        <h2 className="text-3xl font-semibold tracking-tight">
          Ready to organize your work?
        </h2>
        <p className="max-w-md leading-relaxed opacity-80">
          Create an account and add your first project in a minute.
        </p>
        <Link
          href="/signup"
          className={buttonVariants({
            variant: "secondary",
            className: "h-11 px-5",
          })}
        >
          Create your account
        </Link>
      </div>
    </section>
  );
}
