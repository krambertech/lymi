import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { Lantern } from "../components/lantern";
import { REPO } from "./edit-link";
import { Sub } from "./frame";
import { SECTIONS, TileLink } from "./overview-tiles";

/** Where each kind of decision is kept, so it is written once. */
const SOURCES: { what: string; where: string; path: string }[] = [
  {
    what: "What the product is for",
    where: "PRODUCT.md",
    path: "PRODUCT.md",
  },
  {
    what: "The words we use: card, deck, archive",
    where: "CONTEXT.md",
    path: "CONTEXT.md",
  },
  {
    what: "The big rules, and which guide to read",
    where: "DESIGN.md",
    path: "DESIGN.md",
  },
  {
    what: "Every colour, size and timing",
    where: "packages/design/tokens.css",
    path: "packages/design/tokens.css",
  },
  {
    what: "Each rule, why it exists and its exceptions",
    where: "docs/design/system",
    path: "docs/design/system",
  },
  {
    what: "The components on these pages",
    where: "apps/web/src/client/components",
    path: "apps/web/src/client/components",
  },
];

/** The front page: what the system is, a way into each page, and where things live. */
export function Overview() {
  useEffect(() => {
    document.title = "Lymi design";
  }, []);
  return (
    <article>
      <header className="pb-14">
        <div className="grid justify-items-start gap-5">
          <Lantern className="size-14" glow />
          <h1 className="text-4xl font-medium tracking-[-0.02em] text-balance">
            Lymi design system
          </h1>
          <p className="max-w-[58ch] text-md text-pretty text-ink-secondary">
            Lymi is a flashcard app. This site shows how it looks, moves and talks. Examples use the
            real components, so what you see here is what ships.
          </p>
          <p className="max-w-[58ch] text-base text-pretty text-ink-muted">
            The rules live in Markdown files that people and coding agents both read. Each page
            links to its file and its code.
          </p>
        </div>
      </header>

      <div className="grid">
        {SECTIONS.map((section) => (
          <Sub key={section.title} title={section.title}>
            <ul className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
              {section.tiles.map((tile) => (
                <li key={tile.title} className="grid">
                  <TileLink tile={tile} />
                </li>
              ))}
            </ul>
          </Sub>
        ))}

        <Sub
          title="Where things live"
          note="Each kind of decision lives in one file, and these pages read from them."
        >
          <div className="edge overflow-hidden rounded-lg bg-plate">
            {SOURCES.map((s) => (
              <a
                key={s.path}
                href={`${REPO}${s.path}`}
                target="_blank"
                rel="noreferrer"
                className="group grid gap-1 border-b border-edge px-5 py-3.5 transition-colors duration-150 last:border-b-0 hoverable:hover:veil @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @2xl:items-center @2xl:gap-6"
              >
                <span className="text-base text-ink">{s.what}</span>
                <code className="font-mono text-sm text-ink-secondary">{s.where}</code>
                <ArrowUpRight
                  aria-hidden="true"
                  className="hidden size-4 text-ink-faint transition-colors duration-150 hoverable:group-hover:text-ink @2xl:block"
                />
              </a>
            ))}
          </div>
        </Sub>
      </div>
    </article>
  );
}
