import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../session";
import { Mark } from "./Mark";
import { Approach } from "./landing/Approach";
import { BuiltFor } from "./landing/BuiltFor";
import { Experience } from "./landing/Experience";
import { Hero } from "./landing/Hero";
import { Organizers } from "./landing/Organizers";
import { Problem } from "./landing/Problem";
import { Container } from "./landing/ui";

const LINKS = [
  ["Features", "#features"],
  ["How it works", "#approach"],
  ["For hackathons", "#organizers"],
  ["Pricing", "#pricing"],
  ["Docs", "/docs"],
] as const;

export function Landing() {
  const { session } = useSession();
  const start = session.ready && session.signedIn ? "/dashboard" : "/signin";
  const page = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = page.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (reduce) {
      for (const node of nodes) node.dataset.in = "true";
      return;
    }
    root.classList.add("is-motion");
    const view = window.innerHeight * 0.92;
    const watch: HTMLElement[] = [];
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.top < view && box.bottom > 0) node.dataset.in = "true";
      else watch.push(node);
    }
    if (!watch.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "true";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" },
    );
    for (const node of watch) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page" ref={page}>
      <header className="sticky top-0 z-20 h-16 border-b border-transparent bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <Container className="flex h-full items-center gap-6">
          <Link className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.03em]" to="/">
            <Mark size={22} />
            calibr8
          </Link>
          <nav className="mx-auto hidden items-center gap-6 text-[13px] text-[color-mix(in_srgb,var(--ink)_80%,transparent)] lg:flex">
            {LINKS.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <Link
            className="is-primary ml-auto inline-flex h-10 items-center rounded-full bg-[var(--ink)] px-4 text-[13px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)]"
            to={start}
          >
            Get started <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </header>
      <main>
        <Hero start={start} />
        <Problem />
        <Approach />
        <BuiltFor />
        <Experience start={start} />
        <Organizers start={start} />
      </main>
    </div>
  );
}
