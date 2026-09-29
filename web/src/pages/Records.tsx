import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { asApiError, getRecords, type ApiError, type TableData } from "../api";
import { Empty, Loading, Status } from "../components/Status";
import { useSession } from "../session";

const OBJECTS = ["projects", "teams", "tracks", "judges", "scores"] as const;

export function Records() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("object") ?? "projects";
  const object = OBJECTS.includes(requested as (typeof OBJECTS)[number]) ? requested : "projects";
  const { session } = useSession();
  const [table, setTable] = useState<TableData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancel = false;
    setTable(null);
    setError(null);
    getRecords(object).then(
      (rows) => {
        if (!cancel) setTable(rows);
      },
      (err: unknown) => {
        if (!cancel) setError(asApiError(err));
      },
    );
    return () => {
      cancel = true;
    };
  }, [object]);

  const organizer = session.role === "organizer";

  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div className="tabs" role="tablist">
          {OBJECTS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === object}
              className={name === object ? "on" : ""}
              onClick={() => setParams({ object: name })}
            >
              {name}
            </button>
          ))}
        </div>
        {organizer ? (
          <a className="text-link" href="/api/export.csv">
            Export CSV
          </a>
        ) : null}
      </div>
      {error ? <Status error={error} /> : null}
      {!error && !table ? <Loading /> : null}
      {!error && table && !table.rows.length ? <Empty>No rows.</Empty> : null}
      {!error && table && table.rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((value, cellIndex) => (
                    <td key={cellIndex}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
