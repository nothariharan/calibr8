import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../session";
import { Loading } from "./Status";

export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { session } = useSession();
  if (!session.ready) return <Loading />;
  if (!session.signedIn) {
    return (
      <div className="panel stack gate">
        <h2>Sign in required</h2>
        <p>This page checks the session on the server. Open a fixture session first.</p>
        <Link className="btn" to="/signin">
          Sign in
        </Link>
      </div>
    );
  }
  if (session.role !== role) {
    return (
      <div className="panel stack gate">
        <h2>This session cannot open that page</h2>
        <p>
          Signed in as {session.name}
          {session.eventName ? ` · ${session.eventName}` : ""}. This page is for a {role} account.
        </p>
        <Link className="btn" to="/signin">
          Switch session
        </Link>
      </div>
    );
  }
  return children;
}
