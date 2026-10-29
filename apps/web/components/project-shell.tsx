"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  Folder,
  Kanban,
  List,
  PanelLeft,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { CreateProjectForm } from "@/components/create-project-form";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError, api, queryKeys } from "@/lib/api";
import type { Project } from "@/lib/projects";
import { cn } from "cn";

type ProjectDetail = {
  id: string;
  key: string;
  name: string;
};

const SECTIONS = [
  { id: "board", label: "Board", icon: Kanban },
  { id: "backlog", label: "Backlog", icon: List },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function sectionFromPath(pathname: string): SectionId {
  if (pathname.endsWith("/backlog")) return "backlog";
  if (pathname.endsWith("/team")) return "team";
  if (pathname.endsWith("/settings")) return "settings";
  return "board";
}

function sectionHref(section: SectionId, projectId: string) {
  if (section === "board") return `/projects/${projectId}`;
  return `/projects/${projectId}/${section}`;
}

function keyMark(key: string) {
  return key.slice(0, 2);
}

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id;
  const [sidebarOverride, setSidebarOverride] = useState<"open" | "closed" | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const section = sectionFromPath(pathname);
  const sectionLabel =
    SECTIONS.find((item) => item.id === section)?.label ?? "Board";

  const projectQuery = useQuery({
    queryKey: queryKeys.project(id),
    enabled: Boolean(id),
    queryFn: async () => (await api.get<ProjectDetail>(`/projects/${id}`)).data,
  });
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });

  const project = projectQuery.data;
  const listed = projectsQuery.data ?? [];
  const switchProjects: ProjectDetail[] =
    project && !listed.some((item) => item.id === project.id)
      ? [project, ...listed]
      : listed;

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOverride("closed");
  }

  function toggleSidebar() {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const open = sidebarOverride === "open" || (sidebarOverride === null && wide);
    setSidebarOverride(open ? "closed" : "open");
  }

  if (projectQuery.isError) {
    const missing =
      projectQuery.error instanceof ApiError && projectQuery.error.status === 404;
    return (
      <main className="flex min-h-svh flex-col items-start gap-3 p-6">
        <h1 className="text-2xl font-semibold">
          {missing ? "Project not found" : "Couldn't load this project"}
        </h1>
        <Link href="/projects" className="text-sm underline">
          Back to projects
        </Link>
      </main>
    );
  }

  const name = project?.name ?? "Project";
  const key = project?.key ?? "";

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {sidebarOverride === "open" && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOverride("closed")}
        />
      )}
      <aside
        className={cn(
          "z-40 w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          sidebarOverride === "open" &&
            "flex max-md:fixed max-md:inset-y-0 max-md:left-0",
          sidebarOverride === "closed" && "hidden",
          sidebarOverride === null && "hidden md:flex",
        )}
      >
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Switch project"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background">
                {key ? keyMark(key) : "–"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {key || "Loading"}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                {switchProjects.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="min-h-10"
                    render={<Link href={`/projects/${item.id}`} />}
                    onClick={closeSidebarOnMobile}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
                      {keyMark(item.key)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.id === id && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-10"
                render={<Link href="/projects" />}
                onClick={closeSidebarOnMobile}
              >
                <Folder />
                All projects
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-10"
                onClick={() => setCreateOpen(true)}
              >
                <Plus />
                Create project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          <div>
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Project
            </p>
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = item.id === section;
                return (
                  <li key={item.id}>
                    <Link
                      href={sectionHref(item.id, id)}
                      aria-current={active ? "page" : undefined}
                      onClick={closeSidebarOnMobile}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-md px-2 text-sm",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/70",
                      )}
                    >
                      <Icon />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Workspace
            </p>
            <Link
              href="/projects"
              onClick={closeSidebarOnMobile}
              className="flex h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-sidebar-accent/70"
            >
              <Folder />
              All projects
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Toggle sidebar"
              aria-expanded={
                sidebarOverride === null ? undefined : sidebarOverride === "open"
              }
              onClick={toggleSidebar}
            >
              <PanelLeft />
            </Button>
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              <li className="shrink-0">
                <Link
                  href="/projects"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Projects
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-foreground">
                /
              </li>
              <li className="min-w-0 truncate">
                <Link
                  href={`/projects/${id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {name}
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-foreground">
                /
              </li>
              <li className="shrink-0 font-medium">{sectionLabel}</li>
            </ol>
          </nav>
          <ProfileMenu />
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Projects group tickets. The key is used in ticket IDs.
            </DialogDescription>
          </DialogHeader>
          <CreateProjectForm
            key={createOpen ? "open" : "closed"}
            onCreated={(created) => {
              setCreateOpen(false);
              router.push(`/projects/${created.id}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
