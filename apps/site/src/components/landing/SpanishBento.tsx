import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  BENTO_HUES,
  CheckList,
  Examples,
  LanguageBento,
  Meanings,
  NoteRows,
  Tile,
} from "./LanguageBento";

const EXAMPLES = [
  {
    text: "Mañana madrugo para ir al trabajo.",
    translation: msg`Tomorrow I’m getting up early for work.`,
  },
  {
    text: "La sobremesa duró dos horas.",
    translation: msg`We sat talking at the table for two hours.`,
  },
];

const MEANINGS = [
  { language: "English", lang: "en", meaning: "Ticket" },
  { language: "Українська", lang: "uk", meaning: "Квиток" },
  { language: "Русский", lang: "ru", meaning: "Билет" },
];

const Es = ({ children }: { children: string }) => <span lang="es">{children}</span>;

/** Spanish learners' own needs, with examples you can hear across the top. */
export function SpanishBento() {
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
        <Examples lang="es" examples={EXAMPLES} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Spain or Latin America</Trans>}
        body={
          <Trans>
            The ready-made decks use the Spanish of Spain. When you add a word, AI notes where Latin
            America says it differently.
          </Trans>
        }
      >
        <NoteRows
          lang="es"
          rows={[
            {
              term: "el coche",
              note: (
                <Trans>
                  Latin America: <Es>el carro</Es>
                </Trans>
              ),
            },
            {
              term: "el zumo",
              note: (
                <Trans>
                  Latin America: <Es>el jugo</Es>
                </Trans>
              ),
            },
          ]}
        />
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Meanings in your language</Trans>}
        body={
          <Trans>
            The ready-made Spanish decks come with meanings in English, Ukrainian or Russian, and
            Lymi itself is in all three.
          </Trans>
        }
      >
        <Meanings lang="es" term="el billete" meanings={MEANINGS} />
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your old decks</Trans>}
        body={
          <Trans>
            Studied Spanish somewhere else? Bring your cards along. From Anki they keep their
            recordings and their schedule.
          </Trans>
        }
      >
        <CheckList items={["Anki", "Quizlet", "Mochi", "Noji"]} />
      </Tile>
    </LanguageBento>
  );
}
