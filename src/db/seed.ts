import { db, initSchema } from "./index.js";

const accounts = [
  { id: "org_01", name: "Organizer", role: "organizer", token: "org_7f2a" },
  { id: "jdg_01", name: "Judge A", role: "judge", token: "jdg_a_91bc" },
  { id: "jdg_02", name: "Judge B", role: "judge", token: "jdg_b_44de" },
  { id: "prt_01", name: "Participant", role: "participant", token: "prt_2e88" },
] as const;

initSchema();

const insertUser = db.prepare(
  "INSERT OR IGNORE INTO users (id, name, role) VALUES (@id, @name, @role)",
);
const insertSession = db.prepare(
  "INSERT OR IGNORE INTO sessions (token, user_id, role) VALUES (@token, @id, @role)",
);

const seed = db.transaction(() => {
  for (const account of accounts) {
    insertUser.run(account);
    insertSession.run(account);
  }
});

seed();

const count = db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number };
console.log(`seeded ${count.n} sessions`);
