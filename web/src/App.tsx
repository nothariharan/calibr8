import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { RequireRole } from "./components/RequireRole";
import { Shell } from "./components/Shell";
import { Dashboard } from "./pages/Dashboard";
import { Feed } from "./pages/Feed";
import { Pairs } from "./pages/Pairs";
import { SignIn } from "./pages/SignIn";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Records } from "./pages/Records";
import { Standings } from "./pages/Standings";
import { SessionProvider } from "./session";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/signin", element: <SignIn /> },
  {
    element: <Shell />,
    children: [
      { path: "/dashboard", element: <Dashboard />, handle: { title: "Hackathons" } },
      { path: "/dashboard/:eventId", element: <Dashboard />, handle: { title: "Hackathon" } },
      { path: "/projects", element: <Projects />, handle: { title: "Hackathon" } },
      { path: "/projects/:id", element: <ProjectDetail />, handle: { title: "Project" } },
      { path: "/standings", element: <Standings />, handle: { title: "Standings" } },
      { path: "/records", element: <Records />, handle: { title: "Records" } },
      { path: "/feed", element: <Feed />, handle: { title: "Hackathon" } },
      {
        path: "/pairs",
        element: (
          <RequireRole role="judge">
            <Pairs />
          </RequireRole>
        ),
        handle: { title: "Close calls" },
      },
    ],
  },
]);

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
