import { Navigate } from "react-router-dom";
import { Loading } from "../components/Status";
import { useSession } from "../session";

export function Projects() {
  const { session } = useSession();
  if (!session.ready) return <Loading />;
  return <Navigate to={session.signedIn ? "/dashboard" : "/signin"} replace />;
}
