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

const ROAD_SIGNS = EXAMS.find((exam) => exam.id === "poland-driving");

const EXAMPLES = [
  { text: "Idę do sklepu po chleb.", translation: msg`I’m going to the shop for bread.` },
  { text: "Pociąg ma spóźnienie.", translation: msg`The train is late.` },
];

/** Polish learners' own needs, with examples you can hear across the top. */
export function PolishBento() {
  return (
    <LanguageBento layout="wide">
      <Tile
        wide
        hue={BENTO_HUES[0]}
        title={<Trans>Examples you can hear</Trans>}
        body={
          <Trans>
            Every example comes with a translation, and a native voice reads the whole sentence.
          </Trans>
        }
      >
        <Examples lang="pl" examples={EXAMPLES} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Stress only where it breaks the rule</Trans>}
        body={
          <Trans>
            Most Polish words stress the second syllable from the end, so their cards leave it out.
            A word that breaks the rule shows its stress when you turn the card.
          </Trans>
        }
      >
        <NoteRows
          lang="pl"
          rows={[
            { term: "muzyka", note: "mùzyka", noteLang: "pl" },
            { term: "byliśmy", note: "bỳliśmy", noteLang: "pl" },
          ]}
        />
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Learning to drive in Poland?</Trans>}
        body={
          <Trans>
            A free deck has every road sign from the regulation, by its picture, with its Polish
            name and code.
          </Trans>
        }
      >
        <ExamLink exam={ROAD_SIGNS} />
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your old decks</Trans>}
        body={
          <Trans>
            Studied Polish somewhere else? Bring your cards along. From Anki they keep their
            recordings and their schedule.
          </Trans>
        }
      >
        <CheckList items={["Anki", "Quizlet", "Mochi", "Noji"]} />
      </Tile>
    </LanguageBento>
  );
}
