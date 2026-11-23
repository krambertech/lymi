import { Trans, useLingui } from "@lingui/react/macro";
import type { ComponentType, ReactNode } from "react";
import { clipUrl } from "../../lib/learn/clips";
import { type FixItem, FixResult, FixRound, fixRecall } from "./FixRound";
import { Quiz, QuizCard } from "./Quiz";
import { type SentenceItem, SentenceResult, SentenceRound, sentenceRecall } from "./SentenceRound";

interface PartProps {
  id: string;
  title: string;
  use: ReactNode;
  children: ReactNode;
}

function useItems() {
  const { t } = useLingui();
  const dictation: SentenceItem[] = [
    {
      kind: "dictation",
      id: "linna",
      src: clipUrl("majas-majja-majast", "k-linna"),
      answers: ["Me läheme linna."],
      explain: (
        <Trans>
          <b lang="et">Linna</b> is to town, with a double n; <b lang="et">lina</b> is linen.
        </Trans>
      ),
    },
    {
      kind: "dictation",
      id: "haiglas",
      src: clipUrl("kohad", "h-haiglas"),
      answers: ["Mari töötab haiglas."],
    },
    {
      kind: "dictation",
      id: "raagid",
      src: clipUrl("kusimused", "q-raagid"),
      answers: ["Kas sa räägid eesti keelt?"],
    },
  ];
  const translate: SentenceItem[] = [
    {
      kind: "translate",
      id: "kodus",
      prompt: t`We’re at home.`,
      src: clipUrl("kohad", "h-kodus"),
      answers: ["Me oleme kodus.", "Meie oleme kodus.", "Oleme kodus."],
    },
    {
      kind: "translate",
      id: "opetaja",
      prompt: t`I’m a teacher.`,
      src: clipUrl("mul-on", "ma-olen-o3petaja"),
      answers: ["Ma olen õpetaja.", "Mina olen õpetaja.", "Olen õpetaja."],
    },
    {
      kind: "translate",
      id: "koolis",
      prompt: t`I’m going to school.`,
      src: clipUrl("majas-majja-majast", "k-kooli"),
      answers: ["Ma lähen kooli.", "Mina lähen kooli.", "Lähen kooli."],
      explain: (
        <Trans>
          <b lang="et">Kooli</b> is to school; <b lang="et">koolis</b> is at school.
        </Trans>
      ),
    },
  ];
  const rewrite: SentenceItem[] = [
    {
      kind: "rewrite",
      id: "joi",
      from: "Ta joob kohvi.",
      cue: t`in the past`,
      src: clipUrl("lihtminevik", "ta-jo3i-kohvi"),
      answers: ["Ta jõi kohvi.", "Tema jõi kohvi."],
      explain: (
        <Trans>
          The past of <b lang="et">joob</b> is <b lang="et">jõi</b>.
        </Trans>
      ),
    },
    {
      kind: "rewrite",
      id: "vasinud",
      from: "Ma olen väsinud.",
      cue: t`say no`,
      src: clipUrl("eitus", "ma-ei-ole-va2sinud"),
      answers: [
        "Ma ei ole väsinud.",
        "Ma pole väsinud.",
        "Mina ei ole väsinud.",
        "Mina pole väsinud.",
      ],
    },
    {
      kind: "rewrite",
      id: "naised",
      from: "Naine joob kohvi.",
      cue: t`about many`,
      src: clipUrl("mitmus", "naised-joovad-kohvi"),
      answers: ["Naised joovad kohvi."],
    },
  ];
  const ask: SentenceItem[] = [
    {
      kind: "ask",
      id: "kus",
      reply: "Ma elan Tartus.",
      src: clipUrl("kusimused", "q-kus"),
      answers: ["Kus sa elad?", "Kus te elate?", "Kus sina elad?", "Kus teie elate?", "Kus elad?"],
    },
    {
      kind: "ask",
      id: "kust",
      reply: "Ma olen pärit Ukrainast.",
      src: clipUrl("kusimused", "q-parit"),
      answers: [
        "Kust sa pärit oled?",
        "Kust sa oled pärit?",
        "Kust te pärit olete?",
        "Kust te olete pärit?",
      ],
    },
    {
      kind: "ask",
      id: "kes",
      reply: "See on Jaan.",
      src: clipUrl("kusimused", "q-kes"),
      answers: ["Kes see on?", "Kes ta on?"],
    },
  ];
  const build: SentenceItem[] = [
    {
      kind: "build",
      id: "majja",
      words: ["kass", "minema", "maja"],
      src: clipUrl("majas-majja-majast", "s-majja"),
      answers: ["Kass läheb majja."],
      explain: (
        <Trans>
          Into the house is <b lang="et">majja</b>, with a double j.
        </Trans>
      ),
    },
    {
      kind: "build",
      id: "joes",
      words: ["me", "ujuma", "jõgi"],
      src: clipUrl("pood-poe", "me-ujume-jo3es"),
      answers: ["Me ujume jões."],
    },
    {
      kind: "build",
      id: "oli-kodus",
      words: ["ta", "olema", "kodu"],
      cue: t`in the past`,
      src: clipUrl("lihtminevik", "ta-oli-kodus"),
      answers: ["Ta oli kodus.", "Tema oli kodus."],
    },
  ];
  const fix: FixItem[] = [
    {
      kind: "fix",
      id: "tallinnas",
      wrong: "Ma elan Tallinnal.",
      answers: ["Ma elan Tallinnas."],
      src: clipUrl("kohad", "s-elan-tallinnas"),
      explain: (
        <Trans>
          In a town takes <b lang="et">-s</b>: <b lang="et">Tallinnas</b>.
        </Trans>
      ),
    },
    {
      kind: "fix",
      id: "fix-vasinud",
      wrong: "Ma ei olen väsinud.",
      answers: ["Ma ei ole väsinud."],
      src: clipUrl("eitus", "ma-ei-ole-va2sinud"),
    },
    {
      kind: "fix",
      id: "kassi",
      wrong: "Mul on kolm kassid.",
      answers: ["Mul on kolm kassi."],
      src: clipUrl("numbrid", "c-kassid"),
      explain: (
        <Trans>
          After a number from two up, the word takes its third form: <b lang="et">kolm kassi</b>.
        </Trans>
      ),
    },
    {
      kind: "fix",
      id: "fix-raagid",
      wrong: "Kas sa räägib eesti keelt?",
      answers: ["Kas sa räägid eesti keelt?"],
      src: clipUrl("kusimused", "q-raagid"),
    },
  ];
  return { dictation, translate, rewrite, ask, build, fix };
}

function State({ title, children }: { title: string; children: ReactNode }) {
  return <QuizCard title={title}>{children}</QuizCard>;
}

export function KitSentences({ Part }: { Part: ComponentType<PartProps> }) {
  const { t } = useLingui();
  const items = useItems();
  const at = <Item,>(list: readonly Item[], i: number) => list[i] as Item;
  return (
    <>
      <Part
        id="sentence-dictation"
        title={t`Write what you hear`}
        use={t`A sentence to hear, again or slower, and type. Case, commas and the mark at the end don’t count; the answer shows which words differ.`}
      >
        <Quiz
          id="kit-dictation"
          title={t`Write what you hear`}
          items={items.dictation}
          round={(props) => <SentenceRound {...props} />}
          recall={sentenceRecall}
        />
      </Part>
      <Part
        id="sentence-translate"
        title={t`Write it in Estonian`}
        use={t`A sentence in the reader’s language to write in Estonian. Every accepted sentence counts, and the others show once it is checked.`}
      >
        <Quiz
          id="kit-translate"
          title={t`Write it in Estonian`}
          items={items.translate}
          round={(props) => <SentenceRound {...props} />}
          recall={sentenceRecall}
        />
      </Part>
      <Part
        id="sentence-rewrite"
        title={t`Rewrite the sentence`}
        use={t`An Estonian sentence and a cue, such as in the past, say no or about many; the learner writes the new sentence.`}
      >
        <Quiz
          id="kit-rewrite"
          title={t`Rewrite the sentence`}
          items={items.rewrite}
          round={(props) => <SentenceRound {...props} />}
          recall={sentenceRecall}
        />
      </Part>
      <Part
        id="sentence-ask"
        title={t`Write the question`}
        use={t`An Estonian answer; the learner writes the question it answers.`}
      >
        <Quiz
          id="kit-ask"
          title={t`Write the question`}
          items={items.ask}
          round={(props) => <SentenceRound {...props} />}
          recall={sentenceRecall}
        />
      </Part>
      <Part
        id="sentence-build"
        title={t`Make a sentence`}
        use={t`Dictionary words to make into a sentence, with a cue when the tense isn’t the present.`}
      >
        <Quiz
          id="kit-build"
          title={t`Make a sentence`}
          items={items.build}
          round={(props) => <SentenceRound {...props} />}
          recall={sentenceRecall}
        />
      </Part>
      <Part
        id="sentence-states"
        title={t`A written sentence, marked`}
        use={t`Each way an answer can come out: right, nearly right, another form, words that differ, and the wrong order.`}
      >
        <div className="grid gap-4">
          <State title={t`Right`}>
            <SentenceResult item={at(items.translate, 0)} typed="meie oleme kodus" />
          </State>
          <State title={t`Nearly right, marks`}>
            <SentenceResult item={at(items.translate, 1)} typed="Ma olen opetaja" />
          </State>
          <State title={t`Nearly right, a double letter`}>
            <SentenceResult item={at(items.dictation, 1)} typed="Mari tötab haiglas" />
          </State>
          <State title={t`Another form`}>
            <SentenceResult item={at(items.dictation, 0)} typed="Me läheme lina" />
          </State>
          <State title={t`Words that differ`}>
            <SentenceResult item={at(items.ask, 1)} typed="Kus sa ta oled" />
          </State>
          <State title={t`The wrong order`}>
            <SentenceResult item={at(items.ask, 0)} typed="Kus elad sa" />
          </State>
        </div>
      </Part>
      <Part
        id="fix"
        title={t`Fix the sentence`}
        use={t`An Estonian sentence with one wrong word, as learners write it. The learner taps the word, then types the right form; finding and fixing are marked apart.`}
      >
        <Quiz
          id="kit-fix"
          title={t`Fix the sentence`}
          items={items.fix}
          round={(props) => <FixRound {...props} />}
          recall={fixRecall}
        />
      </Part>
      <Part
        id="fix-states"
        title={t`A fixed sentence, marked`}
        use={
          <Trans>
            Found and fixed, found and nearly fixed, found and not fixed, and fixed only after
            another word was tapped.
          </Trans>
        }
      >
        <div className="grid gap-4">
          <State title={t`Found and fixed`}>
            <FixResult item={at(items.fix, 0)} typed="Tallinnas" tried={[]} />
          </State>
          <State title={t`Found, nearly fixed`}>
            <FixResult item={at(items.fix, 3)} typed="raagid" tried={[]} />
          </State>
          <State title={t`Found, not fixed`}>
            <FixResult item={at(items.fix, 1)} typed="oled" tried={[]} />
          </State>
          <State title={t`Fixed, but not found first`}>
            <FixResult item={at(items.fix, 2)} typed="kassi" tried={[0]} />
          </State>
        </div>
      </Part>
    </>
  );
}
