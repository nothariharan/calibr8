import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, login, logout } from "./api";

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
        document.cookie = "session=; Max-Age=0; path=/";
        const payload = await login(email, password);
        location.assign(payload.next || "/dashboard");
      },
      signOut: async () => {
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
