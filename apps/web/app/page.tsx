import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Command,
  ListFilter,
  Mail,
  MessageSquare,
  MoveRight,
  Search,
  Smartphone,
  Target,
  Zap,
} from "lucide-react";

const APP_URL = { signup: "/signup", signin: "/signin" };

const tickets = [
  ["WEB-1", "Set up project structure", "Done", "Low", "3", "Nov 04"],
  ["WEB-7", "Fix login redirect", "In Progress", "High", "3", "Nov 15"],
  ["WEB-8", "Polish empty states", "To Do", "Medium", "2", "Nov 18"],
];

const features = [
  {
    icon: Command,
    title: "Ticket IDs that make sense",
    copy: "Every ticket gets a readable ID like WEB-12, tied to its project.",
  },
  {
    icon: MoveRight,
    title: "A workflow that stays focused",
    copy: "Move work through Backlog, To Do, In Progress, and Done.",
  },
  {
    icon: Zap,
    title: "Priority & story points",
    copy: "Make tradeoffs visible with four priorities and familiar estimates.",
  },
  {
    icon: CalendarDays,
    title: "Dates that keep work moving",
    copy: "Add due dates to tickets and target dates to projects.",
  },
  {
    icon: MessageSquare,
    title: "Context on every ticket",
    copy: "Keep the decisions and details with the work in comments.",
  },
  {
    icon: Mail,
    title: "Useful email notifications",
    copy: "Get notified when tickets or comments are created.",
  },
];

function Logo() {
  return (
    <a
      href="#top"
      className="flex items-center gap-2 font-semibold tracking-tight text-white"
    >
      <span className="grid size-7 place-items-center rounded-[8px] bg-[#1447E6] text-white">
        <Check size={16} strokeWidth={3} />
      </span>
      Ticketing
    </a>
  );
}

function Status({ children }: { children: string }) {
  const styles: Record<string, string> = {
    Backlog: "bg-white/8 text-white/50",
    "To Do": "bg-slate-400/15 text-slate-300",
    "In Progress": "bg-[#1447E6]/20 text-blue-300",
    Done: "bg-emerald-500/15 text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${styles[children]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function Priority({ children }: { children: string }) {
  const color =
    children === "Urgent"
      ? "text-[#E7000B]"
      : children === "High"
        ? "text-orange-300"
        : children === "Medium"
          ? "text-yellow-300"
          : "text-white/45";
  return <span className={`text-[10px] font-medium ${color}`}>{children}</span>;
}

function ProductMockup() {
  return (
    <div className="mockup-shadow relative rounded-xl border border-white/12 bg-[#111] p-2 text-left sm:p-3">
      <div className="flex items-center justify-between border-b border-white/8 px-2 pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <span className="size-2 rounded-full bg-[#1447E6]" /> Website{" "}
          <span className="font-mono text-[10px] text-white/35">WEB</span>
        </div>
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
        </div>
      </div>
      <div className="grid gap-3 p-2 pt-4 lg:grid-cols-[1.25fr_.8fr] lg:p-3">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium text-white/80">
              All tickets <span className="text-white/35">8</span>
            </p>
            <div className="flex gap-1">
              <span className="rounded border border-white/10 px-1.5 py-1 text-[9px] text-white/45">
                Status
              </span>
              <span className="rounded border border-white/10 px-1.5 py-1 text-[9px] text-white/45">
                Priority
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/8">
            {tickets.map(([key, title, status, priority, points, due]) => (
              <div
                key={key}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/6 px-2.5 py-3 last:border-0"
              >
                <span className="font-mono text-[9px] text-[#6e9aff]">
                  {key}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] text-white/85">{title}</p>
                  <p className="mt-1 text-[9px] text-white/30">
                    {points} pts · {due}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <Status>{status}</Status>
                  <div className="mt-1 text-right">
                    <Priority>{priority}</Priority>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[.025] p-3">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#6e9aff]">WEB-7</span>
            <span className="text-[9px] text-white/35">•••</span>
          </div>
          <p className="text-xs font-medium text-white">Fix login redirect</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Status>In Progress</Status>
            <span className="rounded-full bg-orange-400/10 px-2 py-1 text-[10px] text-orange-300">
              High
            </span>
          </div>
          <div className="my-4 h-px bg-white/8" />
          <p className="mb-2 text-[9px] uppercase tracking-wider text-white/30">
            Comments
          </p>
          <div className="flex gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-500/20 text-[8px] text-blue-300">
              M
            </span>
            <p className="text-[10px] leading-relaxed text-white/55">
              Redirect still loops after session expiry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main id="top" className="overflow-hidden bg-white text-[#0A0A0A]">
      <section className="bg-[#0A0A0A] text-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-white/55 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a
              href={APP_URL.signin}
              className="hidden rounded-lg px-3 py-2 text-white/65 transition hover:bg-white/8 hover:text-white sm:block"
            >
              Sign in
            </a>
            <a
              href={APP_URL.signup}
              className="rounded-lg bg-[#1447E6] px-3.5 py-2 font-medium text-white shadow-[0_0_20px_rgba(20,71,230,.25)] transition hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Get started
            </a>
          </div>
        </nav>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[.85fr_1.15fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/55">
              <span className="size-1.5 rounded-full bg-[#1447E6]" />A focused
              issue tracker for independent builders
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-6xl">
              Plan, track and ship work{" "}
              <span className="text-white/35">
                — without the Jira overhead.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/55 sm:text-lg">
              Organize work into projects, give every ticket a clean ID like{" "}
              <span className="font-mono text-white/80">WEB-12</span>, and move
              it from Backlog to Done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={APP_URL.signup}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1447E6] px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                Get started <ArrowRight size={16} />
              </a>
              <a
                href={APP_URL.signin}
                className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
              >
                Sign in
              </a>
            </div>
          </div>
          <ProductMockup />
        </div>
        <div className="border-t border-white/8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-5 lg:px-8">
            <span className="mr-2 text-[10px] uppercase tracking-[.18em] text-white/30">
              Work, made legible
            </span>
            {["WEB-12", "API-4", "DOC-3"].map((key) => (
              <span
                key={key}
                className="rounded border border-white/12 px-2 py-1 font-mono text-[10px] text-blue-300"
              >
                {key}
              </span>
            ))}
            <Status>Backlog</Status>
            <Status>In Progress</Status>
            <Status>Done</Status>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28"
      >
        <div className="max-w-2xl">
          <p className="eyebrow">Everything you need</p>
          <h2 className="section-title">
            Structure for the work that matters.
          </h2>
          <p className="section-copy">
            Ticketing keeps the useful parts of issue tracking and leaves the
            overhead behind.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="rounded-xl border border-black/8 bg-[#fafafa] p-6 transition hover:-translate-y-0.5 hover:border-black/15"
            >
              <Icon
                className="mb-8 text-[#1447E6]"
                size={21}
                strokeWidth={1.7}
              />
              <h3 className="font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-black/8 bg-[#f5f5f5]"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="section-title">
                From idea to done, without detours.
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                ["01", "Create a project", "Give it a name and a short key."],
                [
                  "02",
                  "Add tickets",
                  "Capture the work with priority, points, and dates.",
                ],
                [
                  "03",
                  "Move to Done",
                  "Follow the four-stage workflow until it ships.",
                ],
              ].map(([num, title, copy]) => (
                <div key={num}>
                  <span className="font-mono text-xs text-[#1447E6]">
                    {num}
                  </span>
                  <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-16 rounded-xl border border-black/8 bg-white p-4 shadow-sm sm:p-8">
            <p className="mb-5 text-xs font-medium text-black/45">
              Your workflow
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {["Backlog", "To Do", "In Progress", "Done"].map((status, i) => (
                <div
                  key={status}
                  className="rounded-lg border border-black/8 p-3"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-medium">{status}</span>
                    <span className="text-[10px] text-black/30">
                      {i === 0 ? 2 : 1}
                    </span>
                  </div>
                  <div
                    className={`rounded-md border border-black/8 p-3 ${status === "In Progress" ? "ring-1 ring-[#1447E6]/30" : ""}`}
                  >
                    <span className="font-mono text-[9px] text-[#1447E6]">
                      WEB-{i + 2}
                    </span>
                    <p className="mt-2 text-[11px] font-medium">
                      {
                        [
                          "Map out the scope",
                          "Create login flow",
                          "Fix redirect",
                          "Set project up",
                        ][i]
                      }
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[9px] text-black/40">
                      <span>{i + 1} pts</span>
                      <span>
                        {status === "Done" ? (
                          <CheckCircle2
                            size={12}
                            className="text-emerald-600"
                          />
                        ) : (
                          <Circle size={12} />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <p className="eyebrow dark-eyebrow">Stay in the loop</p>
            <h2 className="section-title text-white">
              Notifications that tell you what changed.
            </h2>
            <p className="section-copy text-white/50">
              Get a useful email when a ticket or comment is created—no noisy
              activity feed required.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-white/50">
              <Bell size={16} className="text-[#6e9aff]" /> Delivered when it
              matters
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#151515] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center gap-3 border-b border-white/8 pb-5">
              <span className="grid size-9 place-items-center rounded-lg bg-[#1447E6]/15 text-[#6e9aff]">
                <Mail size={17} />
              </span>
              <div>
                <p className="text-xs text-white/45">New ticket created</p>
                <p className="mt-1 text-sm font-medium text-white">Ticketing</p>
              </div>
            </div>
            <div className="py-6">
              <p className="font-mono text-xs leading-6 text-[#6e9aff]">
                [WEB-12] Created: Fix login redirect
              </p>
              <div className="mt-5 grid gap-3 text-xs text-white/55">
                <p>
                  <span className="text-white/30">Priority:</span> HIGH
                </p>
                <p>
                  <span className="text-white/30">Story points:</span> 3
                </p>
                <p>
                  <span className="text-white/30">Due:</span> 2026-11-15
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <p className="eyebrow">Find anything</p>
          <h2 className="section-title">
            A clear view of what needs your attention.
          </h2>
          <p className="section-copy">
            Search tickets by text, then narrow the list by status or priority.
          </p>
        </div>
        <div className="rounded-xl border border-black/8 bg-[#fafafa] p-4 sm:p-6">
          <div className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-3 py-3 text-sm text-black/40">
            <Search size={16} />
            <span>Search tickets...</span>
            <span className="ml-auto rounded border border-black/10 px-1.5 py-0.5 font-mono text-[10px]">
              ⌘ K
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="filter-chip">
              All statuses <ChevronDown size={12} />
            </span>
            <span className="filter-chip">
              Priority <ChevronDown size={12} />
            </span>
            <span className="filter-chip">In Progress</span>
          </div>
          <div className="mt-6 divide-y divide-black/8">
            {["WEB-7  Fix login redirect", "WEB-8  Polish empty states"].map(
              (item, i) => (
                <div
                  key={item}
                  className="flex items-center justify-between py-4 text-sm"
                >
                  <span className="font-mono text-xs text-[#1447E6]">
                    {item.split("  ")[0]}{" "}
                    <span className="font-sans text-black/75">
                      {item.split("  ")[1]}
                    </span>
                  </span>
                  <span className="text-xs text-black/40">
                    {i ? "To Do" : "In Progress"}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-black/8 bg-[#f5f5f5]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-5 py-20 text-center lg:flex-row lg:justify-between lg:px-8 lg:py-24 lg:text-left">
          <div>
            <p className="eyebrow">On the go</p>
            <h2 className="section-title">Your work, wherever you are.</h2>
            <p className="section-copy">
              The Ticketing mobile app is in early access.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-[#1447E6]/10 px-3 py-1 text-xs font-medium text-[#1447E6]">
              Early access
            </span>
          </div>
          <div className="phone-mockup">
            <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-black/15" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Projects</span>
              <span className="text-lg text-[#1447E6]">+</span>
            </div>
            <div className="mt-6 rounded-lg border border-black/8 bg-[#fafafa] p-3 text-left">
              <p className="text-xs font-medium">Website</p>
              <p className="mt-1 font-mono text-[9px] text-black/40">
                WEB · 8 tickets
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8">
                <div className="h-full w-2/3 rounded-full bg-[#1447E6]" />
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-black/8 bg-[#fafafa] p-3 text-left">
              <p className="text-xs font-medium">Side project</p>
              <p className="mt-1 font-mono text-[9px] text-black/40">
                SIDE · 3 tickets
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <div className="text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="section-title">Good questions. Straight answers.</h2>
        </div>
        <div className="mt-10 divide-y divide-black/10 border-y border-black/10">
          {[
            [
              "What is Ticketing?",
              "Ticketing is a lightweight, Jira-style issue tracker for solo developers, indie hackers, freelancers, and small dev projects.",
            ],
            [
              "How are ticket IDs created?",
              "Create a project with a 2–5 letter key and tickets are automatically numbered, like WEB-12.",
            ],
            [
              "Can I change a project key?",
              "No. Keys are permanent so your ticket IDs never break.",
            ],
            [
              "What statuses are there?",
              "Backlog, To Do, In Progress, and Done.",
            ],
            [
              "How do notifications work?",
              "Ticketing sends an email when tickets or comments are created.",
            ],
            [
              "Is there a mobile app?",
              "Yes, an early-access mobile app is available.",
            ],
            [
              "Can I invite teammates?",
              "Not yet. Ticketing is single-user today.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:hidden">
                {q}
                <ChevronDown
                  size={17}
                  className="shrink-0 text-black/40 transition group-open:rotate-180"
                />
              </summary>
              <p className="max-w-2xl pt-3 text-sm leading-6 text-black/55">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-[#0A0A0A] px-5 py-20 text-center text-white lg:px-8 lg:py-24">
        <p className="eyebrow dark-eyebrow">Less overhead. More momentum.</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
          Start tracking in minutes.
        </h2>
        <a
          href={APP_URL.signup}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#1447E6] px-5 py-3 text-sm font-medium transition hover:bg-blue-600"
        >
          Get started <ArrowRight size={16} />
        </a>
      </section>
      <footer className="bg-[#0A0A0A] px-5 pb-8 text-white lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
            <a href={APP_URL.signin} className="hover:text-white">
              Sign in
            </a>
            <a href={APP_URL.signup} className="hover:text-white">
              Sign up
            </a>
            <span>© Ticketing</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
