import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "data", "coverage", ".venv", "venv", "__pycache__"]);
const DATABASE_PACKAGES = ["better-sqlite3", "pg", "mongodb", "pymongo", "psycopg", "psycopg2"];
const VALIDATOR_PACKAGES = ["zod", "joi", "pydantic"];
const TEST_RUNNERS = ["vitest", "jest", "mocha", "pytest"];

export interface ProjectFacts {
  root: string;
  manifestDependencies: string[];
  databaseDrivers: string[];
  validators: string[];
  testRunner: string | null;
  testFiles: string[];
}

export function scanTree(root: string): ProjectFacts {
  const absolute = path.resolve(root);
  const manifestDependencies = readManifestPackages(absolute);
  const present = new Set(manifestDependencies);
  const databaseDrivers = DATABASE_PACKAGES.filter((name) => present.has(name));
  const validators = VALIDATOR_PACKAGES.filter((name) => present.has(name));
  const testRunner = TEST_RUNNERS.find((name) => present.has(name)) ?? null;
  const testFiles = collectTestFiles(absolute, absolute);

  for (const name of [...databaseDrivers, ...validators, ...(testRunner ? [testRunner] : [])]) {
    if (!present.has(name)) {
      throw new Error(`reported ${name} but it is not in a manifest under ${absolute}`);
    }
  }

  return { root: absolute, manifestDependencies, databaseDrivers, validators, testRunner, testFiles };
}

function readManifestPackages(root: string): string[] {
  const found = new Set<string>();
  walk(root, (file) => {
    const base = path.basename(file);
    if (base === "package.json") addNodePackages(file, found);
    if (base === "requirements.txt") addRequirementNames(file, found);
    if (base === "pyproject.toml") addPyprojectNames(file, found);
  });
  return [...found].sort();
}

function addNodePackages(file: string, found: Set<string>): void {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const name of Object.keys(parsed.dependencies ?? {})) found.add(name);
  for (const name of Object.keys(parsed.devDependencies ?? {})) found.add(name);
}

function addRequirementNames(file: string, found: Set<string>): void {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const name = line.trim().split(/[=<>\[]/)[0]?.trim().toLowerCase();
    if (name && !name.startsWith("#")) found.add(name);
  }
}

function addPyprojectNames(file: string, found: Set<string>): void {
  const ignored = new Set(["name", "version", "description", "readme", "requires-python", "license"]);
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const quoted = trimmed.match(/^["']([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?["']/);
    if (quoted) found.add(quoted[1].toLowerCase());
    const key = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*["']/);
    if (key && !ignored.has(key[1].toLowerCase())) found.add(key[1].toLowerCase());
  }
}

function collectTestFiles(root: string, dir: string): string[] {
  const files: string[] = [];
  walk(dir, (file) => {
    const base = path.basename(file);
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(base) || /^test_.+\.py$/.test(base) || /_test\.py$/.test(base)) {
      files.push(path.relative(root, file).replaceAll("\\", "/"));
    }
  });
  return files.sort();
}

function walk(dir: string, onFile: (file: string) => void): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile()) onFile(full);
  }
}
