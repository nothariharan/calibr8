import { ArrowRight, Box, GitCompare, Lock, Monitor, Scale } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BrowserChrome } from "./BrowserChrome";
import { Mark } from "./Mark";
import { StrokeLines } from "./StrokeLines";
import { TrackGlyph } from "./TrackGlyph";
import { HERO_PROJECTS, SUBMISSIONS_CLOSED, formatDate } from "../format";
import { useSession } from "../session";
import { useNarrow } from "../visual/progress";
import { generateField } from "../visual/strokes";

export function Landing() {
  const { session } = useSession();
  const narrow = useNarrow();
  const hero = useMemo(
    () => ({
      soft: generateField({ width: 720, height: 640, count: narrow ? 40 : 120, seed: 21 }),
      ink: generateField({ width: 720, height: 640, count: narrow ? 100 : 280, seed: 10 }),
    }),
    [narrow],
  );
  const start = session.ready && session.signedIn ? "/dashboard" : "/signin";
  const startLabel = session.ready && session.signedIn ? "Open your hackathon" : "Get started";

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
        <div className="nav-cta">
          {session.ready && session.signedIn && session.name ? <span className="nav-user">{session.name}</span> : null}
          <Link className="btn" to={start}>
            {startLabel} <ArrowRight size={16} />
          </Link>
        </div>
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
              calibr8 is an offline portal for hackathon judging. Calibration separates project quality from judge leniency.
              Every score sits on a SHA-256 hash chain. One machine, no hosted accounts.
            </p>
            <div className="cta-row">
              <Link className="btn" to={start}>
                {startLabel} <ArrowRight size={16} />
              </Link>
              <a className="btn ghost" href="#calibration">
                How it works
              </a>
            </div>
            {session.signedIn && session.name ? (
              <p className="signed">
                Signed in as {session.name}
                {session.eventName ? ` · ${session.eventName}` : ""}.
              </p>
            ) : null}
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
              <BrowserChrome url="/dashboard" />
              <div className="mini-app">
                <aside className="mini-side">
                  <span className="on">Hackathon</span>
                  <span>Standings</span>
                  <span>Close calls</span>
                  <span>Records</span>
                </aside>
                <div className="mini-main">
                  <div className="mini-head">
                    <strong>Sample Hack 2026</strong>
                    <span>3 shown</span>
                  </div>
                  <div className="mini-grid">
                    {HERO_PROJECTS.map((project) => (
                      <article key={project.id} className="mini-card">
                        <div className="mini-cover">
                          <TrackGlyph track={project.track} />
                        </div>
                        <span className="chip">{project.track}</span>
                        <strong>{project.title}</strong>
                        <span className="meta">{project.team}</span>
                        <span className="meta">{formatDate(project.submitted_at)}</span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <ProblemSection />
        <CalibrationSection />
        <FeatureStrip />
        <WorkspaceSection />
        <OrganizerSection />
      </main>
      <footer className="site-foot">
        <div className="wrap foot-row">
          <span>calibr8</span>
          <span>
            <Link to={start}>{startLabel}</Link>
            <a href="/docs">Docs</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function ProblemSection() {
  const judges = [
    { name: "Judge A", score: "5 / 5", line: "This is a 5. Amazing project.", tone: "high" },
    { name: "Judge B", score: "3 / 5", line: "It works. Nothing more.", tone: "mid" },
    { name: "Judge C", score: "1 / 5", line: "Not sure about this.", tone: "low" },
  ];
  return (
    <section className="section" id="problem">
      <div className="wrap split">
        <div className="copy">
          <p className="eyebrow">The problem</p>
          <h2>Most hackathon judging is inconsistent.</h2>
          <p>
            Different judges, different standards. A generous scale and a harsh scale are not the same measurement. The
            same project can look exceptional or unfinished depending on who scored it.
          </p>
        </div>
        <div className="judge-board">
          {judges.map((judge) => (
            <article key={judge.name} className={`float-card ${judge.tone}`}>
              <header>
                <b>{judge.name}</b>
                <span>{judge.score}</span>
              </header>
              <p>{judge.line}</p>
            </article>
          ))}
          <article className="float-card fair">
            <header>
              <b>With calibration</b>
              <span>Same project</span>
            </header>
            <div className="eq-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>Different standards. One fair result.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function CalibrationSection() {
  const bars = [72, 64, 80, 58, 76];
  return (
    <section className="section" id="calibration">
      <div className="wrap split">
        <div className="copy">
          <p className="eyebrow">Our approach</p>
          <h2>Separate signal from bias.</h2>
          <p>
            Each raw score is project quality plus judge bias plus noise. Calibration pulls project scores toward the
            global mean and judge biases toward zero. Facts shown to a judge are not terms in that equation.
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
          <div className="fair-scores">
            <span>Fair project scores</span>
            <div className="vbars" aria-hidden="true">
              {bars.map((height) => (
                <i key={height} style={{ height }} />
              ))}
            </div>
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
            <p>One Docker container. Judging does not call a hosted account service.</p>
          </article>
          <article>
            <Lock size={18} strokeWidth={1.75} />
            <h3>Tamper-evident</h3>
            <p>Each score&apos;s SHA-256 hash includes the previous hash. A changed score breaks the chain.</p>
          </article>
          <article>
            <Scale size={18} strokeWidth={1.75} />
            <h3>Three criteria</h3>
            <p>Functionality, quality, and innovation, each 0 to 5. The raw score is their mean.</p>
          </article>
          <article>
            <GitCompare size={18} strokeWidth={1.75} />
            <h3>Close calls only</h3>
            <p>A pairwise ballot is stored only when the calibrated gap is under 0.05.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function WorkspaceSection() {
  const { session } = useSession();
  const start = session.ready && session.signedIn ? "/dashboard" : "/signin";
  const startLabel = session.ready && session.signedIn ? "Open your hackathon" : "Get started";
  const [iron, salt, dry] = HERO_PROJECTS;
  const rubric = [
    ["Functionality", "4"],
    ["Quality", "5"],
    ["Innovation", "4"],
  ];
  return (
    <section className="section" id="workspace">
      <div className="wrap workspace-grid">
        <div className="copy">
          <p className="eyebrow">A modern judging experience</p>
          <h2>Everything you need, in one place.</h2>
          <p>
            The hackathon you belong to, the three-part rubric, calibrated standings, and the hash chain. One offline
            workspace.
          </p>
          <Link className="btn" to={start}>
            {startLabel} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="stage">
          <div className="shot shot-standings">
            <div className="browser">
              <BrowserChrome url="/standings" />
              <div className="shot-body">
                <strong>Standings</strong>
                <ul>
                  <li>
                    <span>1 {iron.title}</span>
                    <em>4.191</em>
                  </li>
                  <li>
                    <span>2 {salt.title}</span>
                    <em>4.143</em>
                  </li>
                  <li>
                    <span>3 {dry.title}</span>
                    <em>4.039</em>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="shot shot-judge">
            <div className="browser">
              <BrowserChrome url="/dashboard" />
              <div className="shot-body judge-shot">
                <div>
                  <span className="chip">{iron.track}</span>
                  <h3>{iron.title}</h3>
                  <p>
                    {iron.team} · {formatDate(iron.submitted_at)}
                  </p>
                </div>
                <div className="rubric-preview">
                  {rubric.map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <div className="scale" aria-hidden="true">
                        {["0", "1", "2", "3", "4", "5"].map((n) => (
                          <span key={n} className={n === value ? "on" : ""}>
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="shot shot-records">
            <div className="browser">
              <BrowserChrome url="/dashboard" />
              <div className="shot-body">
                <strong>Hash chain</strong>
                <ol className="chain-pills">
                  <li>score</li>
                  <li>hash</li>
                  <li>score</li>
                  <li className="break">broken</li>
                </ol>
                <p>A changed score fails the check after it.</p>
              </div>
            </div>
          </div>
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
          <h2>Run the hackathon.</h2>
          <p>
            Create an event, add participants while submissions are open, assign judges to tracks, then export the scores
            and check the chain. Sample Hack 2026 is already closed.
          </p>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <b>Create the event</b>
            <p>Name it and set a close time. The seeded event closed at {SUBMISSIONS_CLOSED}.</p>
          </article>
          <article>
            <span>02</span>
            <b>Add participants</b>
            <p>A team, their emails, and a project. Closed events refuse new submissions.</p>
          </article>
          <article>
            <span>03</span>
            <b>Assign judges</b>
            <p>Each judge scores only the tracks you give them, on functionality, quality, and innovation.</p>
          </article>
          <article>
            <span>04</span>
            <b>Export and verify</b>
            <p>
              Download <a href="/api/export.csv">the CSV</a>. The dashboard reports whether the hash chain still holds.
            </p>
          </article>
        </div>
        <div className="closed">
          <Link className="btn" to="/signin">
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
