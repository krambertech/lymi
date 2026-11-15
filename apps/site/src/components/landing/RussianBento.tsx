import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import { BENTO_HUES, BothWays, CheckList, Examples, LanguageBento, Tile } from "./LanguageBento";

const EXAMPLES = [
  { text: "Мы встре́тимся на вокза́ле.", translation: msg`We’ll meet at the station.` },
  { text: "Ёжик живёт в лесу́.", translation: msg`The hedgehog lives in the forest.` },
];

/** Russian learners' own needs, with examples you can hear across the top. */
export function RussianBento() {
  return (
    <LanguageBento layout="wide">
      <Tile
        wide
        hue={BENTO_HUES[0]}
        title={<Trans>Examples you can hear</Trans>}
        body={
          <Trans>
            Every example comes with a translation and keeps its stress marks, and a native voice
            reads the whole sentence.
          </Trans>
        }
      >
        <Examples lang="ru" examples={EXAMPLES} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Ё put back</Trans>}
        body={
          <Trans>
            Books often print ё as е. Add a word from such a book and the card shows its ё until you
            know it.
          </Trans>
        }
      >
        <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <p
            lang="ru"
            className="rounded-md bg-plate px-4 py-3 text-center text-2xl text-ink-muted edge"
          >
            ежик
          </p>
          <ArrowRight className="size-4 text-ink-muted rtl:-scale-x-100" />
          <p
            lang="ru"
            className="rounded-md bg-plate px-4 py-3 text-center text-2xl font-medium text-ink edge"
          >
            <span className="text-amber-mark">ё</span>жик
          </p>
        </div>
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Asked both ways</Trans>}
        body={
          <Trans>
            Lymi asks what a word means, and how to say it from the meaning. The second is what you
            need in a conversation.
          </Trans>
        }
      >
        <BothWays lang="ru" term="вокза́л" meaning={<Trans>Station</Trans>} />
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Studied Russian in Anki before? Your cards keep their recordings and their schedule, so
            nothing starts over.
          </Trans>
        }
      >
        <CheckList
          items={[
            <Trans key="w">Word and example recordings</Trans>,
            <Trans key="s">Review schedule</Trans>,
            <Trans key="n">Notes</Trans>,
          ]}
        />
      </Tile>
    </LanguageBento>
  );
}
