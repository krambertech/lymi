import { Plural, Trans } from "@lingui/react/macro";
import { FileText, Tag, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { BENTO_HUES, CheckList, Tile } from "./LanguageBento";
import { SourceMark } from "./SourceMark";

/** Three tags with their card counts, the middle one picked, and the review that takes just its cards. */
export function TagReview({ tags }: { tags: readonly [string, number][] }) {
  const picked = Math.min(1, tags.length - 1);
  const count = tags[picked]?.[1] ?? 0;
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
      {tags.map(([tag, n], i) => (
        <span
          key={tag}
          className={
            i === picked
              ? "flex items-center gap-2 rounded-full bg-plate px-3.5 py-2 text-md font-medium text-ink shadow-[inset_0_0_0_2px_var(--color-amber)]"
              : "flex items-center gap-2 rounded-full bg-plate px-3.5 py-2 text-md text-ink-secondary edge"
          }
        >
          <Tag className="size-4" />
          {tag}
          <span className="text-ink-muted tabular-nums">{n}</span>
        </span>
      ))}
      <span className="ms-auto rounded-md bg-amber px-4 py-2 text-md font-medium text-amber-ink tabular-nums">
        <Plural value={count} one="Review # card" other="Review # cards" />
      </span>
    </div>
  );
}

/** Files waiting in Smart add. */
export function Files({ names }: { names: readonly string[] }) {
  return (
    <div aria-hidden="true" className="grid gap-2">
      {names.map((name) => (
        <p
          key={name}
          className="flex items-center gap-2.5 rounded-md bg-plate px-3.5 py-2.5 text-md text-ink edge"
        >
          <FileText className="size-4 shrink-0 text-ink-muted" />
          <span className="truncate">{name}</span>
        </p>
      ))}
    </div>
  );
}

/** A card asked from its picture: a textbook cell, one part pointed at. */
export function DiagramCard({ question }: { question: ReactNode }) {
  return (
    <div aria-hidden="true" className="grid gap-2.5 rounded-md bg-plate p-3.5 edge">
      <svg viewBox="0 0 240 120" className="h-28 w-full rounded-sm bg-plate-nested">
        <ellipse
          cx="104"
          cy="60"
          rx="78"
          ry="44"
          className="fill-plate stroke-ink-muted"
          strokeWidth="2"
        />
        <circle
          cx="96"
          cy="58"
          r="17"
          className="fill-plate-nested stroke-ink-muted"
          strokeWidth="2"
        />
        <circle cx="96" cy="58" r="5" className="fill-ink-faint" />
        <ellipse
          cx="146"
          cy="44"
          rx="13"
          ry="6"
          className="fill-none stroke-ink-faint"
          strokeWidth="2"
        />
        <ellipse
          cx="60"
          cy="80"
          rx="12"
          ry="5"
          className="fill-none stroke-ink-faint"
          strokeWidth="2"
        />
        <path d="M113 58 L196 58" className="stroke-amber-mark" strokeWidth="2" />
        <circle cx="113" cy="58" r="3" className="fill-amber-mark" />
        <text x="204" y="64" className="fill-amber-mark text-[18px] font-medium">
          ?
        </text>
      </svg>
      <span className="text-md text-ink">{question}</span>
    </div>
  );
}

/** A small badge picture for reviewing with no connection. */
function OfflinePicture() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-md bg-plate px-4 py-3 edge">
      <span className="grid size-9 place-items-center rounded-full bg-plate-nested text-ink-secondary">
        <WifiOff className="size-4" />
      </span>
      <span className="grid gap-0.5">
        <span className="text-md text-ink">
          <Trans>12 cards reviewed offline</Trans>
        </span>
        <span className="text-sm text-ink-muted">
          <Trans>Sent when you’re back online</Trans>
        </span>
      </span>
    </div>
  );
}

/** Smart add's limits, which stay true only while they match `routes/lessons.ts`. */
export function PdfTile({ hue = BENTO_HUES[1], files }: { hue?: number; files: string[] }) {
  return (
    <Tile
      hue={hue}
      title={<Trans>Slides and PDFs</Trans>}
      body={
        <Trans>
          Smart add reads up to 10 photos and 3 PDFs at a time and picks out the terms. While it’s
          in beta, it reads up to 5 lessons a day.
        </Trans>
      }
    >
      <Files names={files} />
    </Tile>
  );
}

export function DiagramTile({ hue = BENTO_HUES[2] }: { hue?: number }) {
  return (
    <Tile
      hue={hue}
      title={<Trans>Diagrams on cards</Trans>}
      body={
        <Trans>
          A diagram from your slides can be a card’s picture, and Lymi can ask you from the picture.
        </Trans>
      }
    >
      <DiagramCard question={<Trans>What is this part called?</Trans>} />
    </Tile>
  );
}

export function OfflineTile({ hue = BENTO_HUES[2] }: { hue?: number }) {
  return (
    <Tile
      hue={hue}
      title={<Trans>Review on the train</Trans>}
      body={
        <Trans>
          Open Lymi once while you’re online, then review without a connection. Your answers are
          sent when you’re back online.
        </Trans>
      }
    >
      <OfflinePicture />
    </Tile>
  );
}

export function OldDecksTile({ hue = BENTO_HUES[3] }: { hue?: number }) {
  return (
    <Tile
      hue={hue}
      title={<Trans>Bring your old decks</Trans>}
      body={
        <Trans>
          Studied in Anki before? Your cards keep their pictures, tags and schedule, so nothing
          starts over.
        </Trans>
      }
    >
      <CheckList items={["Anki", "Quizlet", "Mochi", "Noji"]} />
    </Tile>
  );
}

/** A deck's instructions above a field AI wrote by them, with the AI mark. */
export function DeckStyle({
  instructions,
  term,
  lang,
  meaning,
}: {
  instructions: ReactNode;
  term: string;
  lang?: string;
  meaning: ReactNode;
}) {
  return (
    <div aria-hidden="true" className="grid gap-2">
      <p className="rounded-md bg-plate px-4 py-3 text-md text-ink-secondary edge">
        {instructions}
      </p>
      <p className="grid gap-1 rounded-md bg-plate px-4 py-3 edge">
        <span className="flex items-center justify-between gap-3">
          <span lang={lang} className="text-lg font-medium text-ink">
            {term}
          </span>
          <SourceMark source="ai" />
        </span>
        <span className="text-md text-ink-secondary">{meaning}</span>
      </p>
    </div>
  );
}
