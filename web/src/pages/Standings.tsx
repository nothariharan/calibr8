import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { asApiError, getStandings, type ApiError, type Standings } from "../api";
import { Empty, Loading, Status } from "../components/Status";
import { formatFixed, formatSigned } from "../format";
import { useSession } from "../session";

export function Standings() {
  const { session } = useSession();
  const [data, setData] = useState<Standings | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancel = false;
    getStandings().then(
      (standings) => {
        if (!cancel) setData(standings);
      },
      (err: unknown) => {
        if (!cancel) setError(asApiError(err));
      },
    );
    return () => {
      cancel = true;
    };
  }, []);

  if (error) return <Status error={error} />;
  if (!data) return <Loading />;

  const organizer = session.role === "organizer" || session.token === "org_7f2a";

  return (
    <div className="stack-lg">
      <div className="toolbar">
        {data.globalMean != null ? <p className="muted">Global mean {formatFixed(data.globalMean, 2)}</p> : <span />}
        {organizer ? (
          <a className="text-link" href="/api/export.csv">
            Export CSV
          </a>
        ) : (
          <p className="muted">The organizer session downloads the score export.</p>
        )}
      </div>
      {!data.projects.length ? (
        <Empty>No standings yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Project</th>
                <th>Raw</th>
                <th>Calibrated</th>
                <th>Shift</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((project) => (
                <tr key={project.id || project.title}>
                  <td>{project.calibratedRank ?? ""}</td>
                  <td>
                    {project.id ? <Link to={`/projects/${project.id}`}>{project.title}</Link> : project.title}
                  </td>
                  <td>{formatFixed(project.rawAvg, 2)}</td>
                  <td>{formatFixed(project.calibrated, 3)}</td>
                  <td>{formatSigned(project.rankDelta)}</td>
                  <td>{project.reviewCount ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.judges.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Judge</th>
                <th>Bias</th>
                <th>Raw mean</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.judges.map((judge) => (
                <tr key={judge.id || judge.name}>
                  <td>{judge.name}</td>
                  <td>{formatFixed(judge.bias, 3)}</td>
                  <td>{formatFixed(judge.rawMean, 2)}</td>
                  <td>{judge.reviewCount ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
