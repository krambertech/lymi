import { Trans } from "@lingui/react/macro";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Tile } from "./JapaneseBento";

/** One card's meaning in each language the ready-made decks are written in; data, so never translated. */
const MEANINGS = [
  { language: "English", lang: "en", meaning: "Dear; expensive" },
  { language: "Русский", lang: "ru", meaning: "Дорогой" },
  { language: "Українська", lang: "uk", meaning: "Дорогий" },
];

/** A front, as the card shows it before the turn. */
function Face({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-[104px] content-between gap-3 rounded-md bg-plate p-3.5 edge">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="text-2xl font-medium tracking-[-0.02em] text-text">{children}</span>
    </div>
  );
}

/** Estonian learners' own needs, each in a line and a small picture. */
export function EstonianBento() {
  return (
    <div className="mt-12 grid gap-2.5 @3xl:grid-cols-2 @4xl:mt-16">
      <Tile
        title={<Trans>Meanings in your language</Trans>}
        body={
          <Trans>
            The ready-made Estonian decks come with meanings in English, Russian or Ukrainian, and
            Lymi itself is in all three.
          </Trans>
        }
      >
        <div aria-hidden="true" className="rounded-md bg-plate edge">
          <p
            lang="et"
            className="border-b border-edge px-3.5 py-3 text-xl font-medium tracking-[-0.02em] text-text"
          >
            kallis
          </p>
          {MEANINGS.map((m) => (
            <p
              key={m.lang}
              className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 not-last:border-b not-last:border-edge"
            >
              <span lang={m.lang} className="text-md text-text">
                {m.meaning}
              </span>
              <span lang={m.lang} className="text-sm text-muted">
                {m.language}
              </span>
            </p>
          ))}
        </div>
      </Tile>

      <Tile
        title={<Trans>Asked both ways</Trans>}
        body={
          <Trans>
            Lymi asks what a phrase means, and how to say it from the meaning. The second is what
            you need at the till.
          </Trans>
        }
      >
        <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Face label={<Trans>What does it mean?</Trans>}>
            <span lang="et">Tere!</span>
          </Face>
          <ArrowRight className="size-4 text-muted rtl:-scale-x-100" />
          <Face label={<Trans>How do you say it?</Trans>}>
            <Trans>Hello!</Trans>
          </Face>
        </div>
      </Tile>

      <Tile
        title={<Trans>Every letter counts</Trans>}
        body={
          <Trans>
            Õ, ä, ö and ü stay exactly as you typed them, so <span lang="et">tuli</span>, fire, and{" "}
            <span lang="et">tüli</span>, a quarrel, are two different cards.
          </Trans>
        }
      >
        <div aria-hidden="true" className="grid grid-cols-2 gap-2">
          <p className="grid gap-1 rounded-md bg-plate px-4 py-3 edge">
            <span lang="et" className="text-3xl font-medium text-text">
              tuli
            </span>
            <span className="text-sm text-muted">
              <Trans>Fire</Trans>
            </span>
          </p>
          <p className="grid gap-1 rounded-md bg-plate px-4 py-3 edge">
            <span lang="et" className="text-3xl font-medium text-text">
              t<span className="text-amber-mark">ü</span>li
            </span>
            <span className="text-sm text-muted">
              <Trans>A quarrel</Trans>
            </span>
          </p>
        </div>
      </Tile>

      <Tile
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Studied Estonian in Anki before? Your cards keep their recordings and their schedule, so
            nothing starts over.
          </Trans>
        }
      >
        <ul className="grid gap-1.5 text-md text-text">
          {[
            <Trans key="r">Recordings</Trans>,
            <Trans key="s">Review schedule</Trans>,
            <Trans key="n">Notes and forms</Trans>,
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-good-soft text-good">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}
