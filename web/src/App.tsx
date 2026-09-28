import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Shell } from "./components/Shell";
import { Feed } from "./pages/Feed";
import { Pairs } from "./pages/Pairs";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Records } from "./pages/Records";
import { Standings } from "./pages/Standings";
import { SessionProvider } from "./session";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  {
    element: <Shell />,
    children: [
      { path: "/projects", element: <Projects />, handle: { title: "Projects" } },
      { path: "/projects/:id", element: <ProjectDetail />, handle: { title: "Project" } },
      { path: "/standings", element: <Standings />, handle: { title: "Standings" } },
      { path: "/records", element: <Records />, handle: { title: "Records" } },
      { path: "/feed", element: <Feed />, handle: { title: "Judge feed" } },
      { path: "/pairs", element: <Pairs />, handle: { title: "Pairs" } },
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
