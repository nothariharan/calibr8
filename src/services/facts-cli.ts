import { scanTree } from "./facts.js";

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error("usage: facts-cli <directory> [directory...]");
  process.exit(1);
}

for (const root of roots) {
  const facts = scanTree(root);
  console.log(JSON.stringify(facts));
}
