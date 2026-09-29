export type DemoFacts = {
  scanned: true;
  databaseDrivers: string[];
  validators: string[];
  testRunner: string | null;
  testFiles: string[];
};

export type DemoProject = {
  id: string;
  title: string;
  team: string;
  people: string[];
  problem: string;
  built: string;
  mark: string;
  tree: string;
  facts: DemoFacts;
};

export type DemoJudge = {
  id: string;
  name: string;
  seat: string;
  watch: string;
};

export const HACKATHON = {
  name: "International Environmental Hackathon",
  about:
    "Five teams each took one environmental measurement and built a data project that still holds the last reading after the network drops.",
  simulation:
    "This room is a simulation. Ballots stay in this browser and are not written to the portal.",
};

export const CRITERIA = [
  {
    id: "functionality",
    label: "Functionality",
    anchor: "Does the record they described stay available? 0 does not open. 3 keeps the last reading. 5 works end to end.",
  },
  {
    id: "quality",
    label: "Quality",
    anchor: "Is the path real? 0 is a facade. 3 has a working path. 5 has validation, errors, and tests.",
  },
  {
    id: "innovation",
    label: "Innovation",
    anchor: "Is this particular to the problem they named? 0 could be any demo. 3 fits the brief. 5 is specific to that site.",
  },
] as const;

export const CONDUCT = [
  {
    title: "Score the project in front of you",
    body: "Leave the other four for their own turn. Do not rank the set while you are scoring.",
  },
  {
    title: "Keep the four seats separate",
    body: "Do not read another judge's numbers. Switch seats only when you mean to score as that person.",
  },
  {
    title: "A missing test is not a zero",
    body: "Only Canopy Latch submitted a tree with a test runner. The other four were scanned and list none.",
  },
  {
    title: "The note is not a score",
    body: "Write what you saw. The sentence is stored with the ballot. It is not added into the three numbers.",
  },
  {
    title: "Finish the seat",
    body: "Each judge scores all five projects before leaving the seat.",
  },
];

export const JUDGES: DemoJudge[] = [
  {
    id: "amira",
    name: "Amira Okonkwo",
    seat: "Hydrology",
    watch: "Whether the measurement still exists when the link drops.",
  },
  {
    id: "luis",
    name: "Luis Ferrer",
    seat: "Civic data",
    watch: "Whether the path they described actually runs.",
  },
  {
    id: "priya",
    name: "Priya Natarajan",
    seat: "Climate records",
    watch: "Whether the method fits the environmental problem they named.",
  },
  {
    id: "kenji",
    name: "Kenji Sato",
    seat: "Field ecology",
    watch: "Whether the record is specific to that field site.",
  },
];

export const PROJECTS: DemoProject[] = [
  {
    id: "canopy-latch",
    title: "Canopy Latch",
    team: "Northline Field Lab",
    people: ["Hana Iversen", "Mateo Ruiz"],
    problem:
      "Species counts vanish when the field tablet loses the workshop network. The last plot has to stay readable.",
    built:
      "An on-device plot log. Each count is checked before it is stored, and a test covers the latch that keeps the last line.",
    mark: "Climate",
    tree: "demo/trees/canopy-latch",
    facts: {
      scanned: true,
      databaseDrivers: ["better-sqlite3"],
      validators: ["zod"],
      testRunner: "vitest",
      testFiles: ["src/plot.test.ts"],
    },
  },
  {
    id: "salt-ledger",
    title: "Salt Ledger",
    team: "Brackish",
    people: ["Noor El-Sayed", "Jonah Pike"],
    problem: "A coastal town needs a salinity record for its wells that still exists when the upload fails.",
    built: "A local ledger of well samples, one row per draw, kept on the machine that took the reading.",
    mark: "Data and analytics",
    tree: "demo/trees/salt-ledger",
    facts: {
      scanned: true,
      databaseDrivers: ["better-sqlite3"],
      validators: [],
      testRunner: null,
      testFiles: [],
    },
  },
  {
    id: "dry-relay",
    title: "Dry Relay",
    team: "Basin School",
    people: ["Asha Menon", "Theo Lang"],
    problem: "Remote water tanks report level by sensor. The last reading has to remain visible after the radio drops.",
    built: "A relay log of tank levels for places off the main line.",
    mark: "Open hardware",
    tree: "demo/trees/dry-relay",
    facts: { scanned: true, databaseDrivers: [], validators: [], testRunner: null, testFiles: [] },
  },
  {
    id: "reef-quiet",
    title: "Reef Quiet",
    team: "Tide Classroom",
    people: ["Sera Adel", "Imani Brooks"],
    problem: "Students survey a reef for bleaching. The sheet should record the coral and leave the student's name off the row.",
    built: "A classroom count table that stores bleaching codes on the island and does not upload names.",
    mark: "Education",
    tree: "demo/trees/reef-quiet",
    facts: { scanned: true, databaseDrivers: [], validators: [], testRunner: null, testFiles: [] },
  },
  {
    id: "ash-interval",
    title: "Ash Interval",
    team: "Ridge Watch",
    people: ["Emil Novak", "Leila Cho"],
    problem: "After a burn, the useful record is the time between ash samples at a named plot, not a generic map.",
    built: "An interval log keyed by plot id, so a later team can see how long the ash sat.",
    mark: "Security",
    tree: "demo/trees/ash-interval",
    facts: { scanned: true, databaseDrivers: [], validators: [], testRunner: null, testFiles: [] },
  },
];

const withRunner = PROJECTS.filter((project) => project.facts.testRunner).length;

export const TEST_RUNNER_LINE = `${withRunner} of ${PROJECTS.length} scanned Environmental projects list a test runner.`;

export const SCORE_WORDS = ["Absent", "Barely there", "Partial", "Works", "Strong", "Done carefully"] as const;

export function projectById(id: string | undefined): DemoProject | undefined {
  return PROJECTS.find((project) => project.id === id);
}

export function judgeById(id: string | undefined): DemoJudge | undefined {
  return JUDGES.find((judge) => judge.id === id);
}

export function neighbor(id: string, step: -1 | 1): DemoProject | undefined {
  const index = PROJECTS.findIndex((project) => project.id === id);
  if (index < 0) return undefined;
  return PROJECTS[index + step];
}

export function factSentence(project: DemoProject): string {
  const facts = project.facts;
  const parts: string[] = [];
  if (facts.databaseDrivers.length) parts.push(`Database: ${facts.databaseDrivers.join(", ")}`);
  if (facts.validators.length) parts.push(`Validator: ${facts.validators.join(", ")}`);
  parts.push(facts.testRunner ? `Test runner: ${facts.testRunner}` : "No test runner");
  if (facts.testFiles.length) parts.push(`Test files: ${facts.testFiles.join(", ")}`);
  return `${parts.join(". ")}.`;
}
