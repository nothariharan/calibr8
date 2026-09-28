import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Shell } from "./components/Shell";
import { Feed } from "./pages/Feed";
import { Pairs } from "./pages/Pairs";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Records } from "./pages/Records";
import { Standings } from "./pages/Standings";
import { SessionProvider } from "./session";

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Shell />}>
            <Route path="/projects" element={<Projects />} handle={{ title: "Projects" }} />
            <Route path="/projects/:id" element={<ProjectDetail />} handle={{ title: "Project" }} />
            <Route path="/standings" element={<Standings />} handle={{ title: "Standings" }} />
            <Route path="/records" element={<Records />} handle={{ title: "Records" }} />
            <Route path="/feed" element={<Feed />} handle={{ title: "Judge feed" }} />
            <Route path="/pairs" element={<Pairs />} handle={{ title: "Pairs" }} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
