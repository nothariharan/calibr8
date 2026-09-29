import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mark } from "../components/Mark";
import { useSession } from "../session";

export function SignIn() {
  const { session, signIn, signOut } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  return (
    <main className="signin">
      <header className="signin-bar">
        <Link className="brand" to="/">
          <Mark />
          calibr8
        </Link>
        {session.signedIn ? (
          <button type="button" className="btn-ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        ) : null}
      </header>
      <div className="signin-card">
        <p className="eyebrow">Event account</p>
        <h1>Sign in.</h1>
        <p className="lede">
          Judges, organizers, and participants sign in with the email on their assignment. That account opens the hackathon
          it belongs to.
        </p>
        {session.signedIn && session.name ? (
          <p className="signed">
            Signed in as {session.name}
            {session.eventName ? ` · ${session.eventName}` : ""}. <Link to="/dashboard">Open your hackathon</Link>
          </p>
        ) : null}
        <form className="signin-form" onSubmit={(event) => void submit(event)}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
