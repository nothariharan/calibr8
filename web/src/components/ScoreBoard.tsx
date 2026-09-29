import { useEffect, useRef } from "react";

const WORDS = ["Absent", "Barely there", "Partial", "Works", "Strong", "Done carefully"] as const;

export type BoardRow = {
  id: string;
  title: string;
  functionality: number;
  quality: number;
  innovation: number;
};

function mean(row: BoardRow): number {
  return (row.functionality + row.quality + row.innovation) / 3;
}

function feedback(row: BoardRow): string {
  const parts = [
    ["Functionality", row.functionality],
    ["Quality", row.quality],
    ["Innovation", row.innovation],
  ] as const;
  return parts.map(([label, score]) => `${label} ${score} — ${WORDS[score]}`).join(". ") + ".";
}

export function ScoreBoard({ rows }: { rows: BoardRow[] }) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const node: HTMLOListElement = list;
    function onWheel(event: WheelEvent) {
      const max = node.scrollHeight - node.clientHeight;
      if (max <= 1 || event.deltaY === 0) return;
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1;
      const next = Math.min(max, Math.max(0, node.scrollTop + event.deltaY * line));
      if (next === node.scrollTop) return;
      node.scrollTop = next;
      event.preventDefault();
    }
    list.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => list.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  return (
    <section className="reel-slide" data-reel-id="board" aria-label="Your scores">
      <div className="score-board">
        <p className="reel-label">After your ballots</p>
        <h2>What you scored</h2>
        <p className="reel-scale">The number is the mean of the three scores you gave. The line under it is that ballot in words.</p>
        <ol ref={listRef}>
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <em>{mean(row).toFixed(2)}</em>
              </div>
              <p>{feedback(row)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
