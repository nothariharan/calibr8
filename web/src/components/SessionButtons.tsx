import { Link } from "react-router-dom";
import { useSession } from "../session";

export function SessionButtons() {
  const { session, signOut } = useSession();
  if (!session.ready) return <p className="muted session-note">Checking session…</p>;
  if (!session.signedIn) {
    return (
      <div className="session-btns">
        <Link className="btn" to="/signin">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="session-card">
      <p className="session-label">{session.name}</p>
      {session.eventName ? <p className="muted">{session.eventName}</p> : null}
      {session.tracks.length ? <p className="muted">{session.tracks.join(", ")}</p> : null}
      <div className="session-btns">
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
