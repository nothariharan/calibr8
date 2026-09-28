import type { ApiError } from "../api";

export function Status({ error }: { error: ApiError }) {
  const headline = error.status ? `${error.status} ${error.statusText}`.trim() : error.message;
  const detail = error.message && error.message !== error.statusText && error.message !== headline ? error.message : "";
  return (
    <div className="status" role="alert">
      <p>{headline}</p>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: string }) {
  return <p className="empty">{children}</p>;
}

export function Loading() {
  return <p className="loading">Loading…</p>;
}
