import { SESSIONS, useSession } from "../session";

export function SessionButtons() {
  const { session, choose } = useSession();
  return (
    <div className="session-btns">
      {SESSIONS.map((item) => (
        <button
          key={item.token}
          type="button"
          className={session.token === item.token ? "on" : ""}
          onClick={() => choose(item.token)}
        >
          {item.label}
        </button>
      ))}
      <button type="button" onClick={() => choose("")}>
        Sign out
      </button>
    </div>
  );
}
