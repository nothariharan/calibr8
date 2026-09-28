import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { asApiError, getProject, type ApiError, type Project } from "../api";
import { usePageTitle } from "../components/Shell";
import { Loading, Status } from "../components/Status";
import { TrackGlyph } from "../components/TrackGlyph";
import { formatDate } from "../format";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancel = false;
    setProject(null);
    setError(null);
    getProject(id).then(
      (row) => {
        if (!cancel) setProject(row);
      },
      (err: unknown) => {
        if (!cancel) setError(asApiError(err));
      },
    );
    return () => {
      cancel = true;
    };
  }, [id]);

  usePageTitle(project?.title ?? "Project");

  if (error) return <Status error={error} />;
  if (!project) return <Loading />;

  return (
    <div className="detail">
      <article className="panel">
        <div className="detail-art">
          <TrackGlyph track={project.track} />
        </div>
        <div className="fields">
          <div className="field">
            <span>Track</span>
            <div>{project.track ? <span className="chip">{project.track}</span> : "—"}</div>
          </div>
          <div className="field">
            <span>Team</span>
            <div>{project.team || "—"}</div>
          </div>
          <div className="field">
            <span>Summary</span>
            <div>{project.summary || "—"}</div>
          </div>
          <div className="field">
            <span>Submitted</span>
            <div>{project.submitted_at ? formatDate(project.submitted_at) : "—"}</div>
          </div>
          <div className="field">
            <span>Repository</span>
            <div>
              {project.repo_url ? (
                <a href={project.repo_url}>{project.repo_url}</a>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div className="field">
            <span>Record</span>
            <div className="muted">{project.id}</div>
          </div>
        </div>
      </article>
      <aside className="panel stack">
        <h2>Demo seal</h2>
        <p className="muted">The HMAC key is committed in source. This checks that the SVG was produced by this server.</p>
        <a className="text-link" href={`/projects/${project.id}/certificate`}>
          Open the seal
        </a>
        <Link className="text-link" to="/projects">
          Back to projects
        </Link>
      </aside>
    </div>
  );
}
