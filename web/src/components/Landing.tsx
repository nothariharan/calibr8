import { ArrowRight, Box, GitCompare, Lock, Monitor, Scale } from "lucide-react";
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { BrowserChrome } from "./BrowserChrome";
import { Mark } from "./Mark";
import { SessionButtons } from "./SessionButtons";
import { StrokeLines } from "./StrokeLines";
import { TrackGlyph } from "./TrackGlyph";
import { HERO_PROJECTS, SUBMISSIONS_CLOSED, formatDate } from "../format";
import { useSession } from "../session";
import { useNarrow, useSectionProgress } from "../visual/progress";
import { buildScenes, type Scenes } from "../visual/scenes";
import { generateField, lerpStrokes, type Stroke } from "../visual/strokes";

export function Landing() {
  const { session } = useSession();
  const narrow = useNarrow();
  const scenes = useMemo(
    () => buildScenes({ step: narrow ? 7 : 4, clusters: narrow ? 8 : 16 }),
    [narrow],
  );
  const hero = useMemo(
    () => ({
      soft: generateField({ width: 720, height: 640, count: narrow ? 40 : 120, seed: 21 }),
      ink: generateField({ width: 720, height: 640, count: narrow ? 100 : 280, seed: 10 }),
    }),
    [narrow],
  );

  return (
    <div className="landing">
      <header className="wrap site-nav">
        <Link className="brand" to="/">
          <Mark />
          <span>calibr8</span>
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#calibration">How it works</a>
          <a href="#organizers">For hackathons</a>
          <a href="/docs">Docs</a>
        </nav>
        <Link className="btn nav-cta" to="/projects">
          Get started <ArrowRight size={16} />
        </Link>
      </header>
      <main>
        <section className="wrap hero">
          <div>
            <p className="eyebrow">Evaluation platform for hackathons</p>
            <h1>
              Fairer judging
              <br />
              for bigger ideas.
            </h1>
            <p className="lede">
              calibr8 is an offline portal. Calibration separates project quality from judge leniency. Each score sits on a
              SHA-256 hash chain. One Docker container, four fixture sessions, and no hosted accounts.
            </p>
            <div className="cta-row">
              <Link className="btn" to="/projects">
                Get started <ArrowRight size={16} />
              </Link>
              <a className="btn ghost" href="#calibration">
                How it works
              </a>
            </div>
            {session.signedIn && session.label ? <p className="signed">Signed in as {session.label}</p> : null}
            <div className="proofs">
              <article>
                <Scale size={18} strokeWidth={1.75} />
                <strong>Calibrated scoring</strong>
                <span>Separates project quality from judge leniency.</span>
              </article>
              <article>
                <Lock size={18} strokeWidth={1.75} />
                <strong>Tamper-evident</strong>
                <span>Each score sits on a SHA-256 hash chain.</span>
              </article>
              <article>
                <Monitor size={18} strokeWidth={1.75} />
                <strong>Runs offline</strong>
                <span>One Docker container. No hosted accounts.</span>
              </article>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-field" aria-hidden="true">
              <StrokeLines
                width={720}
                height={640}
                groups={[
                  { strokes: hero.soft, color: "#6d7cff" },
                  { strokes: hero.ink, color: "#3b5bff" },
                ]}
              />
            </div>
            <div className="browser">
              <BrowserChrome url="/projects" />
              <div className="mini-app">
                <aside className="mini-side">
                  <span className="on">Projects</span>
                  <span>Standings</span>
                  <span>Records</span>
                  <span>Judge feed</span>
                </aside>
                <div className="mini-main">
                  <div className="mini-head">
                    <strong>Projects</strong>
                    <span>Fixture sample</span>
                  </div>
                  <div className="mini-grid">
                    {HERO_PROJECTS.map((project) => (
                      <Link key={project.id} className="mini-card" to={`/projects/${project.id}`}>
                        <div className="mini-cover">
                          <TrackGlyph track={project.track} />
                        </div>
                        <span className="chip">{project.track}</span>
                        <strong>{project.title}</strong>
                        <span className="meta">{project.team}</span>
                        <span className="meta">{formatDate(project.submitted_at)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <ProblemSection scenes={scenes} />
        <CalibrationSection scenes={scenes} />
        <FeatureStrip />
        <WorkspaceSection />
        <IntegritySection scenes={scenes} />
        <PairwiseSection scenes={scenes} />
        <OrganizerSection />
      </main>
      <footer className="site-foot">
        <div className="wrap foot-row">
          <span>calibr8</span>
          <span>
            <Link to="/projects">Get started</Link>
            <a href="/docs">Docs</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function ProblemSection({ scenes }: { scenes: Scenes }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useSectionProgress(ref);
  const shared = (scenes.problem.clusters[0]?.to ?? []).map((stroke) => ({
    ...stroke,
    opacity: stroke.opacity * progress,
  }));
  return (
    <section className="section" id="problem" ref={ref}>
      <div className="wrap split">
        <div className="copy">
          <p className="eyebrow">The problem</p>
          <h2>Most hackathon judging is inconsistent.</h2>
          <p>
            Different judges, different standards. A generous scale and a harsh scale are not the same measurement. Scroll,
            and the three scales move onto one distribution.
          </p>
        </div>
        <div>
          <div className="clusters">
            {scenes.problem.clusters.map((item) => (
              <Cluster
                key={item.id}
                title={item.label}
                strokes={lerpStrokes(item.from, item.to, progress)}
                width={scenes.problem.width}
                height={scenes.problem.height}
              />
            ))}
            <figure className="cluster">
              <div>
                <StrokeLines
                  width={scenes.problem.width}
                  height={scenes.problem.height}
                  groups={[{ strokes: shared, color: "#3b5bff" }]}
                />
              </div>
              <figcaption>With calibration</figcaption>
            </figure>
          </div>
          <p className="caption">{progress < 0.55 ? "Different standards." : "Same scale."}</p>
        </div>
      </div>
    </section>
  );
}

function Cluster({ title, strokes, width, height }: { title: string; strokes: Stroke[]; width: number; height: number }) {
  return (
    <figure className="cluster">
      <div>
        <StrokeLines width={width} height={height} groups={[{ strokes, color: "#171717" }]} />
      </div>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function CalibrationSection({ scenes }: { scenes: Scenes }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useSectionProgress(ref);
  const strokes = lerpStrokes(scenes.calibration.from, scenes.calibration.to, progress);
  return (
    <section className="section" id="calibration" ref={ref}>
      <div className="wrap split">
        <div className="copy">
          <p className="eyebrow">Our approach</p>
          <h2>Separate signal from bias.</h2>
          <p>
            Each raw score is project quality plus judge bias plus noise. Calibration pulls project scores toward the global
            mean and judge biases toward zero, so the result is the project, not the judge&apos;s leniency. Facts shown to a
            judge are not terms in that equation.
          </p>
          <a className="btn" href="#features">
            Learn how it works <ArrowRight size={16} />
          </a>
        </div>
        <div className="flow">
          <div className="flow-judges">
            <p>
              <b>Judge A</b>
              <span>Generous</span>
            </p>
            <p>
              <b>Judge B</b>
              <span>Neutral</span>
            </p>
            <p>
              <b>Judge C</b>
              <span>Harsh</span>
            </p>
          </div>
          <div className="flow-model">Calibration model</div>
          <div className="flow-field">
            <StrokeLines
              width={scenes.calibration.width}
              height={scenes.calibration.height}
              groups={[{ strokes, color: "#3b5bff" }]}
            />
            <span>Fair project scores</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureStrip() {
  return (
    <section className="section band" id="features">
      <div className="wrap">
        <p className="eyebrow">Built for real hackathons</p>
        <div className="points">
          <article>
            <Box size={18} strokeWidth={1.75} />
            <h3>Offline first</h3>
            <p>One Docker container. No network required to judge, and no hosted accounts.</p>
          </article>
          <article>
            <Lock size={18} strokeWidth={1.75} />
            <h3>Tamper-evident</h3>
            <p>Each score&apos;s SHA-256 hash includes the previous hash. Changing a stored score fails the check.</p>
          </article>
          <article>
            <Scale size={18} strokeWidth={1.75} />
            <h3>Rich project context</h3>
            <p>A fact scan reads dependency manifests from a local tree. Fixture rows have no tree, so they are not given invented packages.</p>
          </article>
          <article>
            <GitCompare size={18} strokeWidth={1.75} />
            <h3>Pairwise comparison</h3>
            <p>A ballot is stored only when the calibrated gap is under 0.05.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function WorkspaceSection() {
  const [iron, salt, dry] = HERO_PROJECTS;
  return (
    <section className="section" id="workspace">
      <div className="wrap workspace-grid">
        <div className="copy">
          <p className="eyebrow">A modern judging experience</p>
          <h2>Everything you need, in one place.</h2>
          <p>
            Browse the gallery, open a record, score on the feed, and compare a close pair. Standings show the calibrated
            rank beside the raw average. One offline workspace.
          </p>
          <Link className="btn" to="/projects">
            Open the gallery <ArrowRight size={16} />
          </Link>
        </div>
        <div className="stage">
          <div className="shot shot-standings">
            <div className="browser">
              <BrowserChrome url="/standings" />
              <div className="shot-body">
                <strong>Standings</strong>
                <ul>
                  {HERO_PROJECTS.map((project) => (
                    <li key={project.id}>
                      <span>{project.title}</span>
                      <em>{project.track}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="shot shot-judge">
            <div className="browser">
              <BrowserChrome url="/feed" />
              <div className="shot-body judge-shot">
                <div>
                  <span className="chip">{iron.track}</span>
                  <h3>{iron.title}</h3>
                  <p>
                    {iron.team} · {formatDate(iron.submitted_at)}
                  </p>
                </div>
                <div>
                  <p className="kicker">Your score</p>
                  <div className="scale" aria-hidden="true">
                    {["0", "1", "2", "3", "4", "5"].map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </div>
                  <p>0 to 5 on the judge feed.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="shot shot-pairs">
            <div className="browser">
              <BrowserChrome url="/pairs" />
              <div className="shot-body pairs-shot">
                <div>
                  <span className="chip">{salt.track}</span>
                  <h3>{salt.title}</h3>
                  <p>{salt.team}</p>
                </div>
                <div>
                  <span className="chip">{dry.track}</span>
                  <h3>{dry.title}</h3>
                  <p>{dry.team}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="shot shot-records">
            <div className="browser">
              <BrowserChrome url="/records" />
              <div className="shot-body">
                <strong>Records</strong>
                <ul>
                  {HERO_PROJECTS.map((project) => (
                    <li key={project.id}>
                      <span>{project.title}</span>
                      <em>{project.track}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegritySection({ scenes }: { scenes: Scenes }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useSectionProgress(ref);
  const strokes =
    progress < 0.62
      ? lerpStrokes(scenes.integrity.hidden, scenes.integrity.intact, progress / 0.62)
      : lerpStrokes(scenes.integrity.intact, scenes.integrity.broken, (progress - 0.62) / 0.38);
  return (
    <section className="section" id="integrity" ref={ref}>
      <div className="wrap">
        <div className="copy">
          <p className="eyebrow">Hash chain</p>
          <h2>Each score carries the previous hash.</h2>
          <p>
            The chain is score, hash, score, hash, using SHA-256. This drawing builds the chain, then shows a changed score
            breaking it. The page does not read the database. The project certificate is a demo seal; its HMAC key is in the
            server source.
          </p>
        </div>
        <div className="frame">
          <StrokeLines width={scenes.integrity.width} height={scenes.integrity.height} groups={[{ strokes, color: "#171717" }]} />
        </div>
        <div className="chain-labels">
          <span>score</span>
          <span>hash</span>
          <span>score</span>
          <span>hash</span>
        </div>
        {progress >= 0.72 ? <p className="note">A changed score breaks the chain after it.</p> : null}
      </div>
    </section>
  );
}

function PairwiseSection({ scenes }: { scenes: Scenes }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useSectionProgress(ref);
  const left = lerpStrokes(scenes.pairwise.left.from, scenes.pairwise.left.to, progress);
  const right = lerpStrokes(scenes.pairwise.right.from, scenes.pairwise.right.to, progress);
  return (
    <section className="section" id="pairwise" ref={ref}>
      <div className="wrap">
        <div className="copy">
          <p className="eyebrow">Close calls</p>
          <h2>Only the close calls get a ballot.</h2>
          <p>
            A pairwise ballot is stored only when the calibrated gap is under 0.05. Quadratic votes are separate: an integer
            V costs V² credits, on a budget of 100.
          </p>
        </div>
        <div className="frame">
          <StrokeLines
            width={scenes.pairwise.width}
            height={scenes.pairwise.height}
            groups={[
              { strokes: left, color: "#171717" },
              { strokes: right, color: "#6d7cff" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function OrganizerSection() {
  return (
    <section className="section" id="organizers">
      <div className="wrap">
        <div className="copy">
          <p className="eyebrow">For organizers</p>
          <h2>Run the seeded event.</h2>
          <p>Four fixture sessions are already in the database. Submissions for this event are closed.</p>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <b>Open the gallery</b>
            <p>
              Every fixture project is listed on <Link to="/projects">/projects</Link>.
            </p>
          </article>
          <article>
            <span>02</span>
            <b>Pick a session</b>
            <p>Organizer, Judge A, Judge B, or Participant. The button sets that fixture cookie.</p>
          </article>
          <article>
            <span>03</span>
            <b>Score on the feed</b>
            <p>
              A judge sets stars from 0 to 5. The ballot is stored for that judge only. Open <Link to="/feed">/feed</Link>.
            </p>
          </article>
          <article>
            <span>04</span>
            <b>Export CSV</b>
            <p>
              The organizer session downloads the score export from <a href="/api/export.csv">/api/export.csv</a>.
            </p>
          </article>
        </div>
        <div className="closed">
          <SessionButtons />
          <p>Submissions in the seeded event closed at {SUBMISSIONS_CLOSED}.</p>
          <Link className="btn" to="/projects">
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
