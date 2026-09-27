import { initSchema } from "./db/index.js";
import Fastify from "fastify";

initSchema();

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { ok: true, service: "calibr8" };
});

const port = Number(process.env.PORT ?? 8080);
const host = "0.0.0.0";

await app.listen({ port, host });
