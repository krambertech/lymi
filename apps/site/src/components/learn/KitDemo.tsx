import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { KIT_DIALOGUE, KIT_PASSAGES } from "../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "./Dialogue";
import { type GapItem, GapPassage } from "./GapPassage";
import { KitExplorers } from "./KitExplorers";
import { LearnLayout } from "./LearnLayout";
import { type Glossary, LessonContext } from "./lesson-context";
import { Listening, type PassageQuestion, Reading } from "./Passage";
import { WordCards } from "./Word";

/** The demo's words with a card; the demo has no word clips of its own. */
const GLOSSARY: Glossary = {
  õpetaja: { en: msg`teacher`, clip: false },
  arst: { en: msg`doctor`, clip: false },
  sõber: { en: msg`friend`, clip: false },
  palju: { en: msg`a lot, much`, clip: false },
  vend: { en: msg`brother`, clip: false },
  kuulab: { en: msg`listens`, note: msg`From kuulama, to listen.`, clip: false },
  muusikat: { en: msg`music`, note: msg`The partitive of muusika.`, clip: false },
  räägime: { en: msg`we speak`, note: msg`From rääkima, to speak.`, clip: false },
};

function useContent() {
  const { t } = useLingui();
  const listening: PassageQuestion[] = [
    {
      id: "job",
      ask: t`What does Jaan do?`,
      options: [
        { id: "teacher", label: t`He's a teacher` },
        { id: "doctor", label: t`He's a doctor` },
        { id: "student", label: t`He's a student` },
      ],
      answer: "doctor",
      line: 2,
    },
    {
      id: "where",
      ask: t`Where does Jaan live?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
      ],
      answer: "tartu",
      line: 1,
    },
    {
      id: "mari",
      ask: t`Is Mari a doctor?`,
      options: [
        { id: "yes", label: t`Yes, she is` },
        { id: "teacher", label: t`No, she's a teacher` },
        { id: "student", label: t`No, she's a student` },
      ],
      answer: "teacher",
      line: 4,
    },
    {
      id: "language",
      ask: t`Which language do they speak?`,
      options: [
        { id: "et", label: t`Estonian` },
        { id: "en", label: t`English` },
        { id: "ru", label: t`Russian` },
      ],
      answer: "et",
      line: 5,
    },
  ];
  const reading: PassageQuestion[] = [
    {
      id: "job",
      ask: t`What does Mari do?`,
      options: [
        { id: "doctor", label: t`She's a doctor` },
        { id: "teacher", label: t`She's a teacher` },
        { id: "student", label: t`She's a student` },
      ],
      answer: "teacher",
      line: 1,
    },
    {
      id: "peeter",
      ask: t`Who is Peeter?`,
      options: [
        { id: "brother", label: t`Mari's brother` },
        { id: "friend", label: t`Mari's friend` },
        { id: "father", label: t`Mari's father` },
      ],
      answer: "brother",
      line: 4,
    },
    {
      id: "instead",
      ask: t`What does Peeter do instead of reading?`,
      options: [
        { id: "works", label: t`He works` },
        { id: "music", label: t`He listens to music` },
        { id: "writes", label: t`He writes` },
      ],
      answer: "music",
      line: 5,
    },
  ];
  const gaps: GapItem[] = [
    {
      id: "g1",
      before: "Mina",
      after: "õpetaja.",
      answer: "olen",
      options: ["olen", "oled", "on"],
      why: t`Mina, I, takes olen.`,
    },
    {
      id: "g2",
      before: "Minu vend Peeter",
      after: "arst.",
      answer: "on",
      options: ["olen", "on", "olete"],
      why: t`Peeter is ta, he, so: on.`,
    },
    {
      id: "g3",
      before: "Me",
      after: "Tallinnas.",
      answer: "elame",
      options: ["elan", "elame", "elavad"],
      why: t`Me, we, takes -me: elame.`,
    },
    {
      id: "g4",
      before: "Peeter",
      after: "loe palju.",
      answer: "ei",
      options: ["ei", "ole", "ära"],
      why: t`Ei before the bare verb says not: ei loe.`,
    },
    {
      id: "g5",
      before: "Mina",
      after: "iga päev.",
      answer: "loen",
      options: ["loen", "loed", "loeb"],
      why: t`Mina takes -n: loen.`,
    },
  ];
  const line = (clip: keyof typeof KIT_DIALOGUE) => {
    const said = KIT_DIALOGUE[clip];
    return typeof said === "string" ? said : said.text;
  };
  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        { line: "Sina oled Jaan.", why: t`Sina is you: this says “You are Jaan.”` },
        { line: line("d-sina-1"), right: true },
        { line: "Ta on Jaan.", why: t`Ta is he or she: “He is Jaan.”` },
      ],
    },
    { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: "Jah, ma elan Tallinnas.", why: t`You live in Tartu.` },
        { line: "Ei, ma ei elan Tallinnas.", why: t`After ei the verb drops its ending: ei ela.` },
        { line: line("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: line("d-sina-3"), right: true },
        { line: "Jah, ma olen õpetaja.", why: t`You're a doctor, arst.` },
        { line: "Ei, ma ei olen arst.", why: t`After ei, olema is ole; and you are a doctor.` },
      ],
    },
    { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        { line: "Tere hommikust!", why: t`That's good morning; Mari is leaving.` },
        { line: "Kes sina oled?", why: t`That asks who she is; she told you.` },
        { line: line("d-sina-4"), right: true },
      ],
    },
  ];
  return { listening, reading, gaps, dialogue };
}

function Part({
  id,
  title,
  use,
  children,
}: {
  id: string;
  title: string;
  use: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-4 border-t border-edge pt-10 pb-12">
      <div className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-[62ch] text-md text-ink-secondary">{use}</p>
      </div>
      {children}
    </section>
  );
}

const LOCALES = [
  { id: "en", name: "English" },
  { id: "uk", name: "Українська" },
  { id: "ru", name: "Русский" },
];

/** Every practice part of the lesson kit, working, for the people building lessons. */
export function KitDemo() {
  const { t, i18n } = useLingui();
  const content = useContent();
  return (
    <LessonContext.Provider value={{ slug: "kit", glossary: GLOSSARY, finishSection: () => {} }}>
      <WordCards>
        <LearnLayout
          languages={{
            paths: {
              en: "/components/lessons",
              uk: "/components/lessons?lang=uk",
              ru: "/components/lessons?lang=ru",
            },
          }}
          hue={222}
        >
          <div className="mx-auto max-w-[720px] px-5">
            <header className="grid gap-3 pt-8 pb-8">
              <h1 className="text-5xl leading-none font-semibold tracking-[-0.03em]">
                <Trans>Practice parts</Trans>
              </h1>
              <p className="max-w-[52ch] text-lg text-ink-secondary">
                <Trans>
                  The lesson kit's parts for practice after a rule is taught: listening, a passage
                  with gaps, reading and a dialogue. docs/design/estonian-lessons.md says when to
                  use each.
                </Trans>
              </p>
              <nav aria-label={t`Language`} className="flex gap-1.5">
                {LOCALES.map((locale) => (
                  <a
                    key={locale.id}
                    href={
                      locale.id === "en"
                        ? "/components/lessons"
                        : `/components/lessons?lang=${locale.id}`
                    }
                    aria-current={i18n.locale === locale.id ? "page" : undefined}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-sm font-medium",
                      i18n.locale === locale.id
                        ? "bg-ink text-plate"
                        : "bg-plate text-ink ring-1 ring-edge hoverable:hover:bg-plate-hover",
                    )}
                  >
                    {locale.name}
                  </a>
                ))}
              </nav>
            </header>
            <Part
              id="listening"
              title={t`Listening`}
              use={t`Listening: a short passage as one recording, every question at once with lettered answers, one Check, then the text.`}
            >
              <Listening
                id="kit-listening"
                title={t`Listen: meet Jaan`}
                clip="p-jaan"
                sentences={KIT_PASSAGES.jaan}
                questions={content.listening}
              />
            </Part>
            <Part
              id="gaps-pick"
              title={t`Gaps, one at a time`}
              use={t`A passage with gaps, the open gap's words under it, each marked as it is filled.`}
            >
              <GapPassage
                id="kit-gaps-pick"
                title={t`Fill the gaps`}
                gaps={content.gaps}
                mode="pick"
                clip="p-peeter"
              />
            </Part>
            <Part
              id="gaps-drag"
              title={t`Gaps from a bank`}
              use={t`A passage with gaps and one bank of words, dragged or tapped into place and checked together.`}
            >
              <GapPassage
                id="kit-gaps-drag"
                title={t`Fill the gaps`}
                gaps={content.gaps}
                mode="drag"
                spare={["oled", "loeb"]}
                clip="p-peeter"
              />
            </Part>
            <Part
              id="reading"
              title={t`Reading`}
              use={t`A short text to read and hear, every question at once; its words open their cards once checked.`}
            >
              <Reading
                id="kit-reading"
                title={t`What did you read?`}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={KIT_PASSAGES.mari}
                questions={content.reading}
              />
            </Part>
            <Part
              id="dialogue"
              title={t`Dialogue`}
              use={t`A conversation in two voices: the learner picks each reply. Shown first, then sound only for a harder one.`}
            >
              <Dialogue
                id="kit-dialogue"
                title={t`Talk: meeting Mari`}
                part={t`You are Jaan, a doctor from Tartu. Mari speaks first; pick what you say back.`}
                them={t`Mari`}
                turns={content.dialogue}
              />
            </Part>
            <Part
              id="dialogue-sound"
              title={t`Dialogue, sound only`}
              use={t`The same conversation with Mari's lines heard, not shown; each can be read on request.`}
            >
              <Dialogue
                id="kit-dialogue-sound"
                title={t`Talk: meeting Mari`}
                part={t`You are Jaan, a doctor from Tartu. Mari speaks first; pick what you say back.`}
                them={t`Mari`}
                turns={content.dialogue}
                text="sound"
              />
            </Part>
            <KitExplorers Part={Part} />
          </div>
        </LearnLayout>
      </WordCards>
    </LessonContext.Provider>
  );
}
