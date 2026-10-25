import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Lantern } from "../../Lantern";
import type { DocPath } from "../nav";
import { H2, NextLinks } from "../Prose";

function Hero() {
  return (
    <header className="mb-10 flex items-start gap-5">
      <Lantern variant="lit" flicker glow className="size-16 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-4xl font-medium tracking-[-0.025em] text-balance text-text">
          Lymi docs
        </h1>
        <p className="!mb-0 !mt-3 max-w-[56ch] text-lg text-text-2">
          Learn how to add and organize cards, review what you are learning, and connect Lymi to the
          tools you already use.
        </p>
      </div>
    </header>
  );
}

/** One way in: a name, a line on who it is for, and a glimpse of what using it looks like. */
function Path({
  to,
  title,
  blurb,
  children,
}: {
  to: DocPath;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <a
      href={to}
      className="doc-plain group flex flex-col overflow-hidden rounded-lg bg-plate transition-colors duration-150 edge hoverable:hover:bg-plate-2 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-0"
    >
      <div className="flex min-h-32 items-center border-b border-edge bg-plate-2/60 px-4 py-4">
        {children}
      </div>
      <div className="px-4 py-3.5">
        <p className="!mb-0.5 flex items-center gap-1.5 font-medium text-text">
          {title}
          <ArrowRight
            className="size-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-text"
            aria-hidden="true"
          />
        </p>
        <p className="!mb-0 text-base text-muted">{blurb}</p>
      </div>
    </a>
  );
}

/** The cards share two rows, so every preview and every title starts on the same line. */
function Paths() {
  return (
    <div className="mb-12 grid gap-3 md:grid-cols-3 md:grid-rows-[auto_auto] md:gap-y-0">
      <Path
        to="/docs/mcp"
        title="Connect an assistant"
        blurb="Claude, ChatGPT, Gemini, Cursor or Grok, signed in as you."
      >
        <p className="!mb-0 rounded-md rounded-ee-xs bg-plate px-3 py-2 text-base text-text edge">
          Add these five words to my Italian deck
        </p>
      </Path>
      <Path
        to="/docs/quickstart"
        title="Write a script"
        blurb="An API key, curl and your first card in two minutes."
      >
        <code className="block w-full !bg-transparent !p-0 font-mono !text-xs leading-relaxed text-text-2">
          <span className="font-semibold text-text">curl</span> -X POST /api/cards
          <br />
          -H "x-api-key: $LYMI_KEY"
        </code>
      </Path>
      <Path
        to="/docs/import"
        title="Bring your cards"
        blurb="Decks and history from another flashcard app or a word list."
      >
        <span className="flex flex-wrap gap-1.5">
          {["Anki", "Mochi", "Noji", "Pleco", "Quizlet"].map((app) => (
            <span key={app} className="rounded-full bg-plate px-2.5 py-1 text-sm text-text edge">
              {app}
            </span>
          ))}
        </span>
      </Path>
    </div>
  );
}

export function Overview() {
  return (
    <div className="doc-prose">
      <Hero />
      <Paths />
      <H2>Use Lymi</H2>
      <NextLinks
        items={[
          {
            to: "/docs/getting-started",
            title: "Getting started",
            blurb: "Choose a deck, add your first cards and begin a review.",
          },
          {
            to: "/docs/decks",
            title: "Decks and sharing",
            blurb: "Organize cards with sections, series and tags, or share a deck.",
          },
          {
            to: "/docs/mobile",
            title: "Lymi on your phone",
            blurb: "Add the web app to your home screen.",
          },
          {
            to: "/docs/scheduling",
            title: "Review scheduling",
            blurb: "When a card returns and how Lymi chooses what comes next.",
          },
        ]}
      />
      <H2>Take your cards out</H2>
      <NextLinks
        items={[
          {
            to: "/docs/export",
            title: "Export your decks",
            blurb: "Choose an Anki package, a Lymi file or a spreadsheet.",
          },
        ]}
      />
      <H2>Connect your tools</H2>
      <NextLinks
        items={[
          {
            to: "/docs/yomitan",
            title: "Yomitan",
            blurb: "Turn dictionary lookups into cards while you read.",
          },
          {
            to: "/docs/readwise",
            title: "Readwise",
            blurb: "Turn new highlights from reading apps into cards.",
          },
        ]}
      />
      <p>
        The <a href="/docs/api">API reference</a> lists routes, parameters and responses. Technical
        card fields and language formats live in the API section.
      </p>
    </div>
  );
}
