export const SUBMISSIONS_CLOSED = "2026-03-01T18:00:00Z";

export type HeroProject = {
  id: string;
  title: string;
  track: string;
  team: string;
  submitted_at: string;
  summary: string;
};

export const HERO_PROJECTS: HeroProject[] = [
  {
    id: "prj_34",
    title: "Iron Switch",
    track: "Open hardware",
    team: "AmberSwitch",
    submitted_at: "2026-02-28T01:13:00Z",
    summary: "One line of what it does.",
  },
  {
    id: "prj_11",
    title: "Salt Ledger",
    track: "Data and analytics",
    team: "OpenSignal",
    submitted_at: "2026-02-28T13:14:00Z",
    summary: "One line of what it does.",
  },
  {
    id: "prj_25",
    title: "Dry Relay",
    track: "Data and analytics",
    team: "GreenDrift",
    submitted_at: "2026-02-28T22:36:00Z",
    summary: "One line of what it does.",
  },
];

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatFixed(value: number | null, digits: number): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

export function formatSigned(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (value > 0) return `+${value}`;
  return String(value);
}
