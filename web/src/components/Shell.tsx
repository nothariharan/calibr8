import { LayoutGrid, Table } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useMatches } from "react-router-dom";
import { Mark } from "./Mark";
import { SessionButtons } from "./SessionButtons";
import { useSession } from "../session";

const TitleContext = createContext<(title: string | null) => void>(() => {});

export function usePageTitle(title: string) {
  const setTitle = useContext(TitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
}

const NAV = [
  { to: "/dashboard", label: "Hackathons", icon: LayoutGrid, roles: ["judge", "organizer", "participant"] },
  { to: "/records", label: "Records", icon: Table, roles: ["organizer"] },
];

export function Shell() {
  const matches = useMatches();
  const { session } = useSession();
  const [override, setOverride] = useState<string | null>(null);
  const setTitle = useCallback((title: string | null) => setOverride(title), []);
  let routeTitle = "calibr8";
  for (const match of matches) {
    const handle = match.handle as { title?: string } | undefined;
    if (handle?.title) routeTitle = handle.title;
  }
  const title = override ?? routeTitle;

  useEffect(() => {
    document.title = `${title} · calibr8`;
  }, [title]);

  return (
    <TitleContext.Provider value={setTitle}>
      <div className="shell">
        <aside className="side">
          <NavLink className="brand" to="/">
            <Mark />
            calibr8
          </NavLink>
          <nav className="side-nav">
            {NAV.filter((item) => (session.role ? item.roles.includes(session.role) : false)).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "on" : "")}>
                  <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <SessionButtons />
        </aside>
        <div className="workspace">
          <header className="topbar">
            <h1>{title}</h1>
            {session.signedIn && session.eventName ? <p className="role">{session.eventName}</p> : null}
          </header>
          <div className="workspace-body">
            <Outlet />
          </div>
        </div>
      </div>
    </TitleContext.Provider>
  );
}
