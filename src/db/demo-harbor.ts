import fs from "node:fs";
import path from "node:path";
import { scanTree } from "../services/facts.js";
import { db } from "./index.js";

type HarborProject = {
  id: string;
  teamId: string;
  teamName: string;
  members: string[];
  trackId: string;
  title: string;
  summary: string;
  slug: string;
};

const SUBMITTED_AT = "2026-09-20T16:00:00Z";

const PROJECTS: HarborProject[] = [
  {
    id: "prj_h01",
    teamId: "tm_h01",
    teamName: "Latch",
    members: ["participant@example.org", "ada.latch@example.org"],
    trackId: "trk_03",
    title: "Caption Latch",
    summary:
      "Live captions stay on the workshop room screen after the microphone drops. The last line remains readable so anyone who stepped out can still see what was said.",
    slug: "caption-latch",
  },
  {
    id: "prj_h02",
    teamId: "tm_h02",
    teamName: "Route",
    members: ["sam.route@example.org"],
    trackId: "trk_03",
    title: "Key Route",
    summary:
      "A keyboard-only path walks through the registration form without a mouse. Each answer is stored locally so the form can be finished on that machine.",
    slug: "key-route",
  },
  {
    id: "prj_h03",
    teamId: "tm_h03",
    teamName: "Minute",
    members: ["lee.minute@example.org"],
    trackId: "trk_03",
    title: "Plain Minute",
    summary:
      "Meeting notes are rewritten to a lower reading level. The shorter wording keeps the decisions and drops the jargon.",
    slug: "plain-minute",
  },
  {
    id: "prj_h04",
    teamId: "tm_h04",
    teamName: "Ring",
    members: ["noor.ring@example.org"],
    trackId: "trk_03",
    title: "Focus Ring",
    summary:
      "Focus order for the slide tool is written down slide by slide. Each slide records where keyboard focus should land before the talk starts.",
    slug: "focus-ring",
  },
  {
    id: "prj_h05",
    teamId: "tm_h05",
    teamName: "Queue",
    members: ["jun.queue@example.org"],
    trackId: "trk_03",
    title: "Voice Queue",
    summary:
      "Spoken turn-taking in a hybrid room is kept in a queue. People waiting to speak, in the room or remote, take the next turn in order.",
    slug: "voice-queue",
  },
  {
    id: "prj_h06",
    teamId: "tm_h06",
    teamName: "Ledger",
    members: ["ivy.ledger@example.org"],
    trackId: "trk_03",
    title: "Contrast Ledger",
    summary:
      "Slide decks are checked for contrast pairs before they are shown. Each text and background pair is recorded so a failing combination can be fixed.",
    slug: "contrast-ledger",
  },
  {
    id: "prj_h07",
    teamId: "tm_h07",
    teamName: "Bin",
    members: ["kai.bin@example.org"],
    trackId: "trk_02",
    title: "Tide Bin",
    summary:
      "Pier sensor readings are grouped into bins. Nearby samples fold into counts so a noisy tide trace becomes a smaller set.",
    slug: "tide-bin",
  },
  {
    id: "prj_h08",
    teamId: "tm_h08",
    teamName: "Pier",
    members: ["ren.pier@example.org"],
    trackId: "trk_02",
    title: "Sparse Pier",
    summary:
      "Pier counts sit in a small local store. The counts stay on the machine that collected them so a later report does not need a live feed.",
    slug: "sparse-pier",
  },
];

function factsFor(projectId: string): string {
  const root = path.join(process.cwd(), "samples", "harbor", projectId);
  if (!fs.existsSync(root)) return "{}";
  const scanned = scanTree(root);
  return JSON.stringify({
    scanned: true,
    databaseDrivers: scanned.databaseDrivers,
    validators: scanned.validators,
    testRunner: scanned.testRunner,
    testFiles: scanned.testFiles,
  });
}

export function seedHarborDemo(): void {
  db.prepare("INSERT INTO events (id, name, submissions_close) VALUES (?, ?, ?)").run(
    "evt_harbor",
    "Harbor Review",
    "2026-12-15T18:00:00Z",
  );

  const insertTeam = db.prepare("INSERT INTO teams (id, name, members_json) VALUES (?, ?, ?)");
  const insertProject = db.prepare(`
    INSERT INTO projects (id, event_id, team_id, track_id, title, summary, repo_url, submitted_at, facts_json)
    VALUES (?, 'evt_harbor', ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAssignment = db.prepare(
    "INSERT INTO judge_assignments (event_id, judge_id, tracks_json) VALUES (?, ?, ?)",
  );

  insertAssignment.run("evt_harbor", "jdg_01", JSON.stringify(["trk_03"]));
  insertAssignment.run("evt_harbor", "jdg_02", JSON.stringify(["trk_02"]));

  for (const project of PROJECTS) {
    insertTeam.run(project.teamId, project.teamName, JSON.stringify(project.members));
    insertProject.run(
      project.id,
      project.teamId,
      project.trackId,
      project.title,
      project.summary,
      `https://example.org/harbor/${project.slug}`,
      SUBMITTED_AT,
      factsFor(project.id),
    );
  }
}
