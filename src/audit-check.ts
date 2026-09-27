import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { db } from "./db/index.js";
import { verifyDatabase } from "./services/audit.js";

db.pragma("wal_checkpoint(FULL)");
const live = verifyDatabase();
console.log(`LIVE ${JSON.stringify(live)}`);

const source = process.env.DB_PATH ?? path.join(process.cwd(), "data", "calibr8.db");
const copyPath = path.join(path.dirname(source), "tamper.db");
fs.copyFileSync(source, copyPath);

const copy = new Database(copyPath);
copy.prepare("UPDATE scores SET raw_score = raw_score + 1 WHERE id = (SELECT MIN(id) FROM scores)").run();
const tampered = verifyDatabase(copy);
console.log(`TAMPERED ${JSON.stringify(tampered)}`);
copy.close();
fs.unlinkSync(copyPath);

if (!live.verified || tampered.scoreChainValid) {
  process.exit(1);
}
