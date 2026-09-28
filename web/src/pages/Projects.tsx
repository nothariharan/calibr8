import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { asApiError, getProjects, type ApiError, type Project } from "../api";
import { Empty, Loading, Status } from "../components/Status";
import { TrackGlyph } from "../components/TrackGlyph";
import { formatDate } from "../format";

export function Projects() {
  const [rows, setRows] = useState<Project[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancel = false;
    getProjects().then(
      (projects) => {
        if (!cancel) setRows(projects);
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
  if (!rows) return <Loading />;
  if (!rows.length) return <Empty>No projects yet.</Empty>;

  return (
    <>
      <p className="count">{rows.length} submissions</p>
      <div className="cards">
        {rows.map((project) => (
          <Link className="card" key={project.id || project.title} to={`/projects/${project.id}`}>
            <div className="cover">
              <TrackGlyph track={project.track} />
            </div>
            <div className="card-body">
              {project.track ? <span className="chip">{project.track}</span> : null}
              <h2>{project.title}</h2>
              {project.summary ? <p className="clamp">{project.summary}</p> : null}
              <p className="muted">
                {[project.team, project.submitted_at ? formatDate(project.submitted_at) : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
