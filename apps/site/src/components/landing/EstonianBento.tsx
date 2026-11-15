import { Trans } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { BENTO_HUES, BothWays, LanguageBento, Meanings, Tile } from "./LanguageBento";

const MEANINGS = [
  { language: "English", lang: "en", meaning: "Dear; expensive" },
  { language: "Русский", lang: "ru", meaning: "Дорогой" },
  { language: "Українська", lang: "uk", meaning: "Дорогий" },
];

/** Estonian learners' own needs, each in a line and a small picture. */
export function EstonianBento() {
  return (
    <LanguageBento>
      <Tile
        hue={BENTO_HUES[0]}
        title={<Trans>Meanings in your language</Trans>}
        body={
          <Trans>
            The ready-made Estonian decks come with meanings in English, Russian or Ukrainian, and
            Lymi itself is in all three.
          </Trans>
        }
      >
        <Meanings lang="et" term="kallis" meanings={MEANINGS} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Asked both ways</Trans>}
        body={
          <Trans>
            Lymi asks what a phrase means, and how to say it from the meaning. The second is what
            you need at the till.
          </Trans>
        }
      >
        <BothWays lang="et" term="Tere!" meaning={<Trans>Hello!</Trans>} />
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
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
            <span lang="et" className="text-3xl font-medium text-ink">
              tuli
            </span>
            <span className="text-sm text-ink-muted">
              <Trans>Fire</Trans>
            </span>
          </p>
          <p className="grid gap-1 rounded-md bg-plate px-4 py-3 edge">
            <span lang="et" className="text-3xl font-medium text-ink">
              t<span className="text-amber-mark">ü</span>li
            </span>
            <span className="text-sm text-ink-muted">
              <Trans>A quarrel</Trans>
            </span>
          </p>
        </div>
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Studied Estonian in Anki before? Your cards keep their recordings and their schedule, so
            nothing starts over.
          </Trans>
        }
      >
        <ul className="grid gap-1.5 text-md text-ink">
          {[
            <Trans key="r">Recordings</Trans>,
            <Trans key="s">Review schedule</Trans>,
            <Trans key="n">Notes and forms</Trans>,
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-success-soft text-success">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Tile>
    </LanguageBento>
  );
}
