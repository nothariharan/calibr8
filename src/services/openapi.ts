export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "calibr8",
    version: "0.1.0",
    description: "Offline hackathon judging portal. This document is served by the same process as the API.",
  },
  paths: {
    "/health": { get: { summary: "Process health" } },
    "/projects": { get: { summary: "Public project gallery" } },
    "/projects/new": { post: { summary: "Submit a project. Closed events return 400." } },
    "/api/judge/scores": {
      get: { summary: "A judge reads their own scores. Another judge's query returns 403." },
      post: { summary: "Commit a 0 to 5 ballot for the signed-in judge." },
    },
    "/api/export.csv": { get: { summary: "Organizer CSV export" } },
    "/api/calibrate": { get: { summary: "Ridge least-squares calibration of stored ballots" } },
    "/api/audit/verify": { get: { summary: "Recompute the score and audit hash chains" } },
    "/api/pairwise/compare": { post: { summary: "Record one head-to-head result" } },
    "/api/pairwise/rankings": { get: { summary: "Bradley-Terry strengths for projects that have matches" } },
    "/api/projects/{id}/vote": { post: { summary: "Set a quadratic vote. Cost is votes squared." } },
    "/api/voting/results": { get: { summary: "Public tally. Sealed results omit totals." } },
    "/api/voting/unfreeze": { post: { summary: "Organizer publishes the tally" } },
    "/projects/{id}/certificate": { get: { summary: "SVG demo seal. The HMAC key is in the source tree." } },
  },
};

export function docsPage(spec: typeof openApiSpec): string {
  const rows = Object.entries(spec.paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods).map(
        ([method, operation]) => `<tr><td>${method.toUpperCase()}</td><td><code>${path}</code></td><td>${operation.summary}</td></tr>`,
      ),
    )
    .join("");
  return `<table>
    <thead><tr><th>Method</th><th>Path</th><th>Summary</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="muted" style="padding:8px">Raw spec: <a href="/api/openapi.json">/api/openapi.json</a>. No external scripts.</p>`;
}
