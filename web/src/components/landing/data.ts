import type { ThumbVariant } from "./ui";

export type MockProject = {
  name: string;
  tag: string;
  description: string;
  team: string;
  thumb: ThumbVariant;
};

export const PROJECTS: MockProject[] = [
  {
    name: "Iron Switch",
    tag: "Infrastructure",
    description: "A high-performance event router for multi-agent systems.",
    team: "Team Vector",
    thumb: "burst",
  },
  {
    name: "Salt Ledger",
    tag: "Finance",
    description: "A privacy-preserving ledger for offline environments.",
    team: "Team Null",
    thumb: "diamond",
  },
  {
    name: "Dry Relay",
    tag: "Climate",
    description: "Sensor-driven water logistics for remote regions.",
    team: "Team Jal",
    thumb: "ring",
  },
  {
    name: "MediTrace",
    tag: "Healthcare",
    description: "Cold-chain verification for medicine distribution.",
    team: "Team Astra",
    thumb: "cross",
  },
  {
    name: "LearnLoop",
    tag: "Education",
    description: "Offline-first adaptive learning for rural classrooms.",
    team: "Team Shiksha",
    thumb: "triangle",
  },
  {
    name: "CivicMesh",
    tag: "Governance",
    description: "Local government data workflows made simple.",
    team: "Team Janpath",
    thumb: "bars",
  },
];

export const PROJECT_DATE = "Sep 12, 2026";
