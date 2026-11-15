import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EXAMS } from "../../lib/exams";
import {
  BENTO_HUES,
  CheckList,
  ExamLink,
  Examples,
  LanguageBento,
  NoteRows,
  Tile,
} from "./LanguageBento";

const DRIVING = EXAMS.find((exam) => exam.id === "ukraine-driving");

const EXAMPLES = [
  { text: "Зустрі́немося на вокза́лі.", translation: msg`We’ll meet at the station.` },
  { text: "У неді́лю я відпочива́ю.", translation: msg`On Sunday I rest.` },
];

/** Ukrainian learners' own needs, with examples you can hear across the top. */
export function UkrainianBento() {
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
        <Examples lang="uk" examples={EXAMPLES} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Ukrainian, not Russian</Trans>}
        body={
          <Trans>
            AI writes Ukrainian and a native Ukrainian voice reads it. When a word looks like a
            Russian one but means something else, the card’s notes say so.
          </Trans>
        }
      >
        <NoteRows lang="uk" rows={[{ term: "неді́ля", note: <Trans>Sunday, not a week</Trans> }]} />
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Learning to drive in Ukraine?</Trans>}
        body={
          <Trans>
            Free decks cover the driving theory test: the rules of the road and every sign.
          </Trans>
        }
      >
        <ExamLink exam={DRIVING} />
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your Anki deck</Trans>}
        body={
          <Trans>
            Studied Ukrainian in Anki before? Your cards keep their recordings and their schedule,
            so nothing starts over.
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
