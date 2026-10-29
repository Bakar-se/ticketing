export type ProjectCounts = {
  backlog: number;
  todo: number;
  inProgress: number;
  done: number;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  updatedAt: string;
  counts: ProjectCounts;
};

export function totalTickets(counts: ProjectCounts) {
  return counts.backlog + counts.todo + counts.inProgress + counts.done;
}

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

export function timeAgo(iso: string) {
  const deltaSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const elapsed = Math.abs(deltaSeconds);
  const match =
    UNITS.find((unit) => elapsed >= unit.seconds) ?? UNITS[UNITS.length - 1];
  const value = Math.round(deltaSeconds / match.seconds);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    value,
    match.unit,
  );
}
