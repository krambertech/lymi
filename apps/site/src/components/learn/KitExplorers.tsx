import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { clipId, clipUrl } from "../../lib/learn/clips";
import { formText } from "../../lib/learn/forms";
import {
  KIT_BOX,
  KIT_HOUSE,
  KIT_LUGEMA,
  KIT_MAJA,
  KIT_MORPHS,
  KIT_TENSES,
} from "../../lib/learn/kit-explore";
import { eachPairFirst } from "../../lib/learn/quiz";
import { Panel } from "./Explore";
import { Morph, type MorphChain } from "./Morph";
import { Paradigm, type ParadigmRow } from "./Paradigm";
import { Quiz } from "./Quiz";
import { Scene, type SceneItem, type ScenePlace, SceneRound } from "./Scene";
import { Timeline, type TimelinePoint } from "./Timeline";

const src = (text: string) => clipUrl("kit", clipId(text));

type PartProps = { id: string; title: string; use: ReactNode; children: ReactNode };

/** The explorers on the kit page: a table of forms, scenes, tenses on a line, and words changing. */
export function KitExplorers({ Part }: { Part: (props: PartProps) => ReactNode }) {
  const { t } = useLingui();

  const cases: Record<(typeof KIT_MAJA)[number]["id"], { label: string; tip: string }> = {
    nom: { label: t`Nominative`, tip: t`The base form. More than one adds -d.` },
    gen: { label: t`Genitive`, tip: t`Of the house. For one it looks like the base form.` },
    part: {
      label: t`Partitive`,
      tip: t`Part of something, and after numbers. Maju swaps the a for -u.`,
    },
    ill: {
      label: t`Illative`,
      tip: t`Into the house. Majja doubles the j; majasse means the same.`,
    },
    iness: { label: t`Inessive`, tip: t`In the house: -s, and -des for more than one.` },
    elat: { label: t`Elative`, tip: t`Out of the house: -st, and -dest for more than one.` },
  };
  const maja: ParadigmRow[] = KIT_MAJA.map((row) => ({
    id: row.id,
    label: cases[row.id].label,
    et: row.et,
    ask: row.ask,
    tip: cases[row.id].tip,
    cells: row.forms.map((form) => ({ form, src: src(formText(form)) })),
  }));

  const persons: Record<(typeof KIT_LUGEMA)[number]["id"], { label: string; tip: string }> = {
    ma: { label: t`I`, tip: t`-n now, -sin in the past.` },
    sa: { label: t`you`, tip: t`-d now, -sid in the past.` },
    ta: { label: t`he, she`, tip: t`-b now; in the past just -s.` },
    me: { label: t`we`, tip: t`-me now, -sime in the past.` },
    te: { label: t`you, more than one`, tip: t`-te now, -site in the past.` },
    nad: { label: t`they`, tip: t`-vad now; -sid in the past, as for sa.` },
  };
  const lugema: ParadigmRow[] = KIT_LUGEMA.map((row) => ({
    id: row.id,
    label: persons[row.id].label,
    et: row.id,
    tip: persons[row.id].tip,
    cells: row.forms.map((form) => ({ form, src: src(formText(form)) })),
  }));

  const box: Record<(typeof KIT_BOX)[number]["id"], { meaning: string; gloss: string }> = {
    peal: { meaning: t`on`, gloss: t`The cat is on the box.` },
    all: { meaning: t`under`, gloss: t`The cat is under the box.` },
    taga: { meaning: t`behind`, gloss: t`The cat is behind the box.` },
    ees: { meaning: t`in front`, gloss: t`The cat is in front of the box.` },
    korval: { meaning: t`next to`, gloss: t`The cat is next to the box.` },
    sees: { meaning: t`inside`, gloss: t`The cat is inside the box.` },
  };
  const boxPlaces: ScenePlace[] = KIT_BOX.map((place) => ({
    ...place,
    ...box[place.id],
    src: src(place.sentence),
  }));
  const house: Record<(typeof KIT_HOUSE)[number]["id"], { meaning: string; gloss: string }> = {
    majja: { meaning: t`into the house`, gloss: t`The cat goes into the house.` },
    majas: { meaning: t`in the house`, gloss: t`The cat is in the house.` },
    majast: { meaning: t`out of the house`, gloss: t`The cat comes out of the house.` },
  };
  const housePlaces: ScenePlace[] = KIT_HOUSE.map((place) => ({
    ...place,
    ...house[place.id],
    src: src(place.sentence),
  }));
  const boxLabel = t`A cat and a cardboard box`;
  const rounds: (SceneItem & { pair: readonly [string, string] })[] = boxPlaces
    .filter((place) => place.id !== "all")
    .map((place) => ({
      scene: "box",
      label: boxLabel,
      places: boxPlaces,
      answer: place.id,
      pair: [place.id, place.id],
    }));

  const tenses: Record<(typeof KIT_TENSES)[number]["id"], string> = {
    pluperfect: t`Pluperfect`,
    past: t`Past`,
    perfect: t`Perfect`,
    present: t`Present`,
    future: t`Future`,
  };
  const meanings: Record<string, string> = {
    "Ma olin juba söönud.": t`I had already eaten.`,
    "Eile sõin ma kodus.": t`Yesterday I ate at home.`,
    "Ma olen juba söönud.": t`I have already eaten.`,
    "Praegu ma söön.": t`I'm eating now.`,
    "Homme söön ma kodus.": t`Tomorrow I'll eat at home.`,
    "Ma hakkan sööma.": t`I'm going to eat.`,
  };
  const pieces: Record<string, string> = {
    "ol|in": t`olema, past`,
    "ole|n": t`olema, now`,
    "söö|nud": t`the -nud form`,
    "sõi|n": t`past, for ma`,
    "söö|n": t`now, for ma`,
    "hakka|n": t`hakkama, now`,
    "söö|ma": t`the -ma form`,
  };
  const points: TimelinePoint[] = KIT_TENSES.map((tense) => ({
    id: tense.id,
    label: tenses[tense.id],
    et: "et" in tense ? tense.et : undefined,
    at: tense.at,
    reach: "reach" in tense ? tense.reach : undefined,
    examples: tense.examples.map((example) => ({
      sentence: example.sentence,
      meaning: meanings[example.sentence] ?? "",
      src: src(example.sentence),
      build: example.build.map((form) => ({ form, note: pieces[form] ?? "" })),
    })),
  }));

  const steps: Record<string, { label: string; note?: string }> = {
    pood: { label: t`a shop` },
    poe: { label: t`of a shop`, note: t`The od drops and an e comes in: poe- carries most forms.` },
    poes: { label: t`in a shop`, note: t`Poe- plus -s: in a shop.` },
    jalg: { label: t`a foot` },
    jala: { label: t`of a foot`, note: t`The g drops and an a comes in.` },
    jalga: { label: t`partitive`, note: t`The g comes back in the partitive.` },
    tuba: { label: t`a room` },
    toa: { label: t`of a room`, note: t`The b drops and the u becomes o.` },
    toas: { label: t`in a room`, note: t`Toa- plus -s: in a room.` },
    lugema: { label: t`to read` },
    lugeda: { label: t`to read, da-form`, note: t`The m becomes d: -ma turns into -da.` },
    loen: { label: t`I read`, note: t`The g drops and the u becomes o: loe-, plus -n for ma.` },
  };
  const chains: MorphChain[] = KIT_MORPHS.map((chain) => ({
    id: chain.id,
    steps: chain.steps.map((word) => ({
      word,
      label: steps[word]?.label ?? "",
      note: steps[word]?.note,
      src: src(word),
    })),
  }));

  return (
    <>
      <Part
        id="paradigm"
        title={t`Table of forms`}
        use={t`A noun's cases on the tray: tap a form to hear it, its ending lit. Question words can head the rows, and one row or column can be tinted. On a phone the rows stack.`}
      >
        <Panel>
          <Paradigm
            label={t`Forms of maja`}
            columns={[t`One`, t`More than one`]}
            rows={maja}
            highlight={{ row: "iness" }}
            empty={{ title: t`Tap a form`, tip: t`You’ll hear it and read what its ending does.` }}
          />
        </Panel>
      </Part>
      <Part
        id="paradigm-verb"
        title={t`Table of forms, a verb`}
        use={t`The same table for a verb: persons down, tenses across.`}
      >
        <Panel>
          <Paradigm
            label={t`Lugema now and in the past`}
            columns={[t`Now`, t`In the past`]}
            rows={lugema}
            empty={{ title: t`Tap a form`, tip: t`Now the stem is loe-, in the past luge-.` }}
          />
        </Panel>
      </Part>
      <Part
        id="scene"
        title={t`Scene`}
        use={t`A drawing on the tray: pressing a place, on a key or on the drawing, moves the cat there and plays the sentence.`}
      >
        <Panel>
          <Scene scene="box" label={boxLabel} keysLabel={t`Where the cat is`} places={boxPlaces} />
        </Panel>
      </Part>
      <Part
        id="scene-house"
        title={t`Scene with movement`}
        use={t`The same with a house: the cat walks in, sits inside, and comes out.`}
      >
        <Panel>
          <Scene
            scene="house"
            label={t`A cat and a house`}
            keysLabel={t`Where the cat goes`}
            places={housePlaces}
          />
        </Panel>
      </Part>
      <Part
        id="scene-quiz"
        title={t`Scene quiz`}
        use={t`A quiz round on a scene: hear a sentence, then tap the place on the drawing.`}
      >
        <Quiz
          id="kit-scene"
          title={t`Where is the cat?`}
          items={rounds}
          rounds={rounds.length}
          order={eachPairFirst}
          recall={(item) => {
            const place = item.places.find((each) => each.id === item.answer);
            return { label: place?.word ?? "", src: place?.src ?? "" };
          }}
          round={(props) => <SceneRound {...props} />}
        />
      </Part>
      <Part
        id="timeline"
        title={t`Timeline`}
        use={t`Tenses on a line, past to future. Each point plays an example and shows how its verb is built; a band shows what a tense reaches to.`}
      >
        <Panel>
          <Timeline
            label={t`Tenses of sööma`}
            points={points}
            empty={{
              title: t`Tap a tense`,
              tip: t`You’ll hear an example and see how its verb is built.`,
            }}
          />
        </Panel>
      </Part>
      <Part
        id="morph"
        title={t`Word changes`}
        use={t`A word turning into its forms: the letters it drops are struck, the ones it gains are lit.`}
      >
        <Panel>
          <Morph label={t`Words`} chains={chains} />
        </Panel>
      </Part>
    </>
  );
}
