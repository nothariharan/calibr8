import { Link } from "react-router-dom";
import { HACKATHON } from "./data";
import "./demo.css";

export function DemoBanner() {
  return (
    <section className="demo-banner-link">
      <div>
        <h2>{HACKATHON.name}</h2>
        <p className="demo-lede">
          Five environmental data projects and four judge seats. Ballots stay in this browser.
        </p>
      </div>
      <Link className="btn" to="/demo">
        Open the simulation
      </Link>
    </section>
  );
}
