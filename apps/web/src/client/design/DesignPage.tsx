import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Lockup } from "../components/Logo";
import { Segmented } from "../components/Segmented";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { Colour } from "./Colour";
import { Components } from "./Components";
import { Identity } from "./Identity";
import { Motion } from "./Motion";
import { Screens } from "./Screens";
import { Space } from "./Space";
import { Type } from "./Type";
import { Voice } from "./Voice";

const SECTIONS = [
  ["identity", "Identity"],
  ["colour", "Colour"],
  ["type", "Type"],
  ["space", "Space and shape"],
  ["motion", "Motion"],
  ["components", "Components"],
  ["screens", "Screens"],
  ["voice", "Voice"],
] as const;

export default function DesignPage() {
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  const [active, setActive] = useState<string>("identity");

  useEffect(() => {
    let frame = 0;
    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView();
    };
    const scheduleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(scrollToHash);
      });
    };
    scheduleScroll();
    window.addEventListener("hashchange", scheduleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scheduleScroll);
    };
  }, []);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="@container min-h-dvh bg-canvas text-text">
      <header className="sticky top-0 z-(--z-sticky) flex items-center justify-between gap-4 border-b border-edge bg-canvas/90 px-5 py-3 backdrop-blur-md @3xl:px-8">
        <div className="flex items-center gap-4">
          <a href="/" className="rounded-sm">
            <Lockup size={17} flicker />
          </a>
          <span className="hidden text-sm text-muted @xl:inline">Design system</span>
          <span className="edge rounded-full px-2 py-0.5 text-2xs font-medium text-muted">
            Local only
          </span>
        </div>
        <Segmented
          size="sm"
          label="Page theme"
          value={theme}
          onChange={(t) => {
            setTheme(t);
            setThemeState(t);
          }}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-10 @3xl:grid-cols-[180px_1fr] @3xl:px-8">
        <nav aria-label="Sections" className="@3xl:sticky @3xl:top-20 @3xl:self-start">
          <ul className="flex flex-wrap gap-1 @3xl:grid">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={clsx(
                    "block rounded-sm px-2.5 py-1.5 text-sm transition-colors hoverable:hover:text-text",
                    active === id ? "edge bg-plate text-text" : "text-muted",
                  )}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 hidden max-w-[20ch] text-xs text-muted @3xl:block">
            Warm, calm, quick. A small light you bring with you.
          </p>
        </nav>

        <main className="@container min-w-0">
          <div className="pb-6">
            <h1 className="text-4xl font-medium">Lymi</h1>
            <p className="mt-3 max-w-[60ch] text-lg text-text-2">
              A vocabulary app with a storm lantern. This page is the system it is built from: the
              mark, the two rooms, the type, the parts, and the screens they make. Everything here
              is the real component, not a picture of it.
            </p>
          </div>
          <Identity />
          <Colour />
          <Type />
          <Space />
          <Motion />
          <Components />
          <Screens />
          <Voice />
          <footer className="border-t border-edge py-10 text-sm text-muted">
            Tokens live in <code>apps/web/src/client/styles.css</code>. Components in{" "}
            <code>components/</code>, screens in <code>views/</code>. DESIGN.md at the repo root
            mirrors this page for tools that read files.
          </footer>
        </main>
      </div>
    </div>
  );
}
