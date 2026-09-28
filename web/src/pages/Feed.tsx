import { useEffect, useState } from "react";
import { asApiError, getFeed, postScore, type ApiError, type FeedItem } from "../api";
import { Empty, Loading, Status } from "../components/Status";

export function Feed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancel = false;
    getFeed().then(
      (rows) => {
        if (!cancel) setItems(rows);
      },
      (err: unknown) => {
        if (!cancel) setError(asApiError(err));
      },
    );
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!items?.length) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((current) => Math.min(items.length - 1, current + 1));
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((current) => Math.max(0, current - 1));
      }
      if (event.key >= "0" && event.key <= "5") {
        event.preventDefault();
        void save(Number(event.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function save(stars: number) {
    const project = items?.[index];
    if (!project || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postScore(project.id, stars);
      setItems((current) => current?.map((item, itemIndex) => (itemIndex === index ? { ...item, stars } : item)) ?? null);
    } catch (err) {
      setSaveError(asApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Status error={error} />;
  if (!items) return <Loading />;
  if (!items.length) return <Empty>No projects in your tracks.</Empty>;

  const project = items[Math.min(index, items.length - 1)];

  return (
    <div className="feed">
      <article className="panel">
        {project.track ? <span className="chip">{project.track}</span> : null}
        <h2>{project.title}</h2>
        {project.summary ? <p>{project.summary}</p> : null}
        <p className="muted">{[project.team, project.track].filter(Boolean).join(" · ")}</p>
        {project.repo_url ? <p><a href={project.repo_url}>{project.repo_url}</a></p> : null}
        <p className="muted">No local tree scanned for this fixture row.</p>
      </article>
      <aside className="panel stack">
        <p className="muted">
          {index + 1} / {items.length}
        </p>
        <p>0 broken · 3 works · 5 exceptional</p>
        <div className="stars" role="group" aria-label="Score from 0 to 5">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={project.stars === n} disabled={saving} onClick={() => void save(n)}>
              {n}
            </button>
          ))}
        </div>
        <p className="muted">J and K move. 0–5 saves a ballot for this judge only.</p>
        {saveError ? <Status error={saveError} /> : null}
      </aside>
    </div>
  );
}
