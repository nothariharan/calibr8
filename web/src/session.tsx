import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, login, logout, type SessionPayload } from "./api";

export type SessionState = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  eventName: string | null;
  tracks: string[];
  signedIn: boolean;
  ready: boolean;
};

type SessionContextValue = {
  session: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const HOST_KEY = "calibr8-hosted-session";

const HOST_JUDGE = {
  id: "jdg_01",
  name: "Tomas Varga",
  email: "tomas.varga@example.org",
  role: "judge",
  password: "tomas-varga",
  next: "/demo",
};

export function hostedDemo(): boolean {
  if (import.meta.env.VITE_DEMO === "1") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".vercel.app") && host.startsWith("calibr-demo");
}

function readHosted(): SessionState {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    if (!raw) return { ...signedOut, ready: true };
    return fromServer(JSON.parse(raw) as SessionPayload, true);
  } catch {
    return { ...signedOut, ready: true };
  }
}

const signedOut: SessionState = {
  id: null,
  name: null,
  email: null,
  role: null,
  eventName: null,
  tracks: [],
  signedIn: false,
  ready: false,
};

function fromServer(
  payload: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    eventName?: string;
    tracks?: string[];
  },
  ready: boolean,
): SessionState {
  if (!payload.role && !payload.id) return { ...signedOut, ready };
  return {
    id: payload.id ?? null,
    name: payload.name ?? null,
    email: payload.email ?? null,
    role: payload.role ?? null,
    eventName: payload.eventName ?? null,
    tracks: payload.tracks ?? [],
    signedIn: true,
    ready,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(signedOut);

  useEffect(() => {
    if (hostedDemo()) {
      setSession(readHosted());
      return;
    }
    let cancel = false;
    getSession()
      .then((payload) => {
        if (!cancel) setSession(fromServer(payload, true));
      })
      .catch(() => {
        if (!cancel) setSession({ ...signedOut, ready: true });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn: async (email: string, password: string) => {
        if (hostedDemo()) {
          if (email !== HOST_JUDGE.email || password !== HOST_JUDGE.password) {
            throw new Error("This demo opens the judge reel. Choose Judge.");
          }
          localStorage.setItem(
            HOST_KEY,
            JSON.stringify({
              id: HOST_JUDGE.id,
              name: HOST_JUDGE.name,
              email: HOST_JUDGE.email,
              role: HOST_JUDGE.role,
            }),
          );
          location.assign(HOST_JUDGE.next);
          return;
        }
        document.cookie = "session=; Max-Age=0; path=/";
        const payload = await login(email, password);
        location.assign(payload.next || "/dashboard");
      },
      signOut: async () => {
        if (hostedDemo()) {
          localStorage.removeItem(HOST_KEY);
          location.assign("/signin");
          return;
        }
        document.cookie = "session=; Max-Age=0; path=/";
        await logout();
        location.assign("/");
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}
