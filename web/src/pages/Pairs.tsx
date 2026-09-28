import { useCallback, useEffect, useState } from "react";
import { asApiError, getNextPair, pairIsOpen, postCompare, type ApiError, type Matchup } from "../api";
import { Empty, Loading, Status } from "../components/Status";
import { formatFixed } from "../format";

export function Pairs() {
  const [match, setMatch] = useState<Matchup | null | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const load = useCallback(() => {
    setError(null);
    setSaveError(null);
    getNextPair().then(
      (next) => setMatch(next),
      (err: unknown) => {
        setMatch(null);
        setError(asApiError(err));
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = match ? pairIsOpen(match) : false;

  async function choose(winnerId: string) {
    if (!match || !open || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postCompare(match.projectA.id, match.projectB.id, winnerId);
      setMatch(undefined);
      load();
    } catch (err) {
      setSaveError(asApiError(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!match || !open) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "1") {
        event.preventDefault();
        void choose(match.projectA.id);
      }
      if (event.key === "2") {
        event.preventDefault();
        void choose(match.projectB.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (error) return <Status error={error} />;
  if (match === undefined) return <Loading />;
  if (!match) return <Empty>No remaining pair in your tracks.</Empty>;

  return (
    <div className="stack-lg">
      <div className="pair">
        <PairCard project={match.projectA} />
        <PairCard project={match.projectB} />
      </div>
      {open ? (
        <div className="pair-actions">
          <button type="button" className="btn" disabled={saving} onClick={() => void choose(match.projectA.id)}>
            Choose {match.projectA.title}
          </button>
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => void choose(match.projectB.id)}>
            Choose {match.projectB.title}
          </button>
          <p className="muted">
            Gap {formatFixed(match.gap, 3)}. Inside 0.05. Keys 1 and 2 choose a side.
          </p>
        </div>
      ) : (
        <p className="muted">
          {match.gap != null
            ? `Closest gap is ${formatFixed(match.gap, 3)}, which is outside 0.05. No ballot is accepted.`
            : "This pair is outside 0.05. No ballot is accepted."}
        </p>
      )}
      {saveError ? <Status error={saveError} /> : null}
    </div>
  );
}

function PairCard({ project }: { project: Matchup["projectA"] }) {
  return (
    <article className="panel">
      {project.track ? <span className="chip">{project.track}</span> : null}
      <h2>{project.title}</h2>
      {project.summary ? <p>{project.summary}</p> : null}
      <p className="muted">
        {[project.team, project.track].filter(Boolean).join(" · ")}
        {project.calibrated != null ? ` · ${formatFixed(project.calibrated, 3)}` : ""}
      </p>
    </article>
  );
}
