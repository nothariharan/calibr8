import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession } from "./api";

export const SESSIONS = [
  { token: "org_7f2a", label: "Organizer", role: "organizer" },
  { token: "jdg_a_91bc", label: "Judge A", role: "judge" },
  { token: "jdg_b_44de", label: "Judge B", role: "judge" },
  { token: "prt_2e88", label: "Participant", role: "participant" },
] as const;

const TOKEN_MAP: Record<string, { label: string; role: string }> = Object.fromEntries(
  SESSIONS.map((session) => [session.token, { label: session.label, role: session.role }]),
);

export type SessionState = {
  token: string;
  label: string | null;
  role: string | null;
  signedIn: boolean;
};

type SessionContextValue = {
  session: SessionState;
  choose: (token: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readToken(): string {
  const match = document.cookie.match(/(?:^|;)\s*session=([^;]*)/);
  if (!match) return "";
  const token = decodeURIComponent(match[1].trim());
  return token;
}

function initialSession(): SessionState {
  const token = readToken();
  const mapped = TOKEN_MAP[token];
  if (!mapped) return { token: "", label: null, role: null, signedIn: false };
  return { token, label: mapped.label, role: mapped.role, signedIn: true };
}

function labelFromServer(payload: { label?: string; role?: string; name?: string }, fallback: string | null): string | null {
  if (payload.label) return payload.label;
  if (payload.role) {
    const pretty = payload.role.charAt(0).toUpperCase() + payload.role.slice(1);
    if (payload.name && payload.name.toLowerCase() !== payload.role.toLowerCase()) return `${pretty} · ${payload.name}`;
    return pretty;
  }
  if (payload.name) return payload.name;
  return fallback;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialSession);

  useEffect(() => {
    const token = readToken();
    const mapped = TOKEN_MAP[token];
    let cancel = false;
    getSession()
      .then((payload) => {
        if (cancel) return;
        const label = labelFromServer(payload, mapped?.label ?? null);
        const role = payload.role ?? mapped?.role ?? null;
        if (!label && !role) {
          setSession(mapped ? { token, label: mapped.label, role: mapped.role, signedIn: true } : initialSession());
          return;
        }
        setSession({
          token,
          role,
          label: label ?? (role ? role.charAt(0).toUpperCase() + role.slice(1) : null),
          signedIn: true,
        });
      })
      .catch(() => {
        if (cancel) return;
        if (mapped) setSession({ token, label: mapped.label, role: mapped.role, signedIn: true });
        else setSession({ token: "", label: null, role: null, signedIn: false });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      choose: (token: string) => {
        if (token) document.cookie = `session=${token}; path=/`;
        else document.cookie = "session=; Max-Age=0; path=/";
        location.reload();
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
