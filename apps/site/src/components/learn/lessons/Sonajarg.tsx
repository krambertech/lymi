import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  ORDER_DIALOGUE,
  ORDER_HEARD,
  ORDER_MEANING,
  ORDER_NO,
  ORDER_PAIRS,
  ORDER_QUESTIONS,
  ORDER_REWRITE,
  ORDER_TALK,
  ORDER_TRANSLATE,
  ORDER_TWO,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, ListenRows, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Listening } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "sonajarg";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Ma lähen täna Tartusse.": msg`I’m going to Tartu today.`,
  "Täna lähen ma Tartusse.": msg`Today I’m going to Tartu.`,
  "Mari joob hommikul kohvi.": msg`Mari drinks coffee in the morning.`,
  "Hommikul joob Mari kohvi.": msg`In the morning Mari drinks coffee.`,
  "Me oleme õhtul kodus.": msg`We’re at home in the evening.`,
  "Õhtul oleme me kodus.": msg`In the evening we’re at home.`,
  "Jaan töötab laupäeval.": msg`Jaan works on Saturday.`,
  "Laupäeval töötab Jaan.": msg`On Saturday Jaan works.`,
  "Kati elab Tartus.": msg`Kati lives in Tartu.`,
  "Tartus elab Kati.": msg`In Tartu lives Kati.`,
  "Ma pean homme tööle minema.": msg`I have to go to work tomorrow.`,
  "Homme pean ma tööle minema.": msg`Tomorrow I have to go to work.`,
  "Kus sa elad?": msg`Where do you live?`,
  "Mida sa täna teed?": msg`What are you doing today?`,
  "Millal sa tuled?": msg`When are you coming?`,
  "Kellega te räägite?": msg`Who are you talking with?`,
  "Kas sa tuled homme?": msg`Are you coming tomorrow?`,
  "Õhtul tahan ma raamatut lugeda.": msg`In the evening I want to read a book.`,
  "Laupäeval läheme me ujuma.": msg`On Saturday we’re going swimming.`,
  "Täna ma ei tööta.": msg`Today I’m not working.`,
  "Homme me ei tule.": msg`Tomorrow we’re not coming.`,
  "Õhtul ta ei ole kodus.": msg`In the evening he or she isn’t at home.`,
  "Täna töötan ma kodus.": msg`Today I’m working at home.`,
};

const GLOSSARY: Glossary = {
  "täna lähen ma": { en: msg`today I’m going`, show: "Täna lähen ma" },
  "kus sa elad?": { en: msg`where do you live?`, show: "Kus sa elad?" },
  "täna ma ei tööta": { en: msg`today I’m not working`, show: "Täna ma ei tööta" },
  "homme pean ma tööle minema": {
    en: msg`tomorrow I have to go to work`,
    show: "Homme pean ma tööle minema",
  },
};

const MEANING_PROMPTS: Record<(typeof ORDER_MEANING)[number]["id"], MessageDescriptor> = {
  "kus-elad": msg`Where do you live?`,
  "tana-tootan": msg`Today I’m working at home.`,
  "mida-teed": msg`What are you doing today?`,
  "homme-pean": msg`Tomorrow I have to go to work.`,
  "ohtul-tahan": msg`In the evening I want to read a book.`,
  "homme-ei-tule": msg`Tomorrow we’re not coming.`,
  "ohtul-ei-ole": msg`In the evening he or she isn’t at home.`,
  "laupaeval-ujuma": msg`On Saturday we’re going swimming.`,
};

const TRANSLATE_PROMPTS: Record<(typeof ORDER_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "tana-tartusse": msg`Today I’m going to Tartu.`,
  "kus-elad": msg`Where do you live? (To a friend.)`,
  "homme-tootama": msg`Tomorrow I have to work.`,
  "tana-ei-too": msg`Today we’re not working.`,
  "hommikul-joob": msg`In the morning Mari drinks coffee.`,
  "laupaeval-teed": msg`What are you doing on Saturday? (To a friend.)`,
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);

function FrontSwitch() {
  const { t, i18n } = useLingui();
  const [front, setFront] = useState(true);
  return (
    <Panel>
      <Chips
        label={t`What the sentence starts with`}
        items={[
          { label: t`The person`, value: "plain" },
          { label: t`The time or place`, value: "front" },
        ]}
        value={front ? "front" : "plain"}
        onPick={(value) => setFront(value === "front")}
      />
      <ListenRows
        key={front ? "front" : "plain"}
        items={ORDER_PAIRS.map((pair) => {
          const said = front ? pair.front : pair.plain;
          return { main: <span lang="et">{said}</span>, sub: meaning(said, i18n), src: src(said) };
        })}
      />
      <p aria-live="polite" className="text-md text-ink-secondary">
        {front ? (
          <Trans>
            The time or place comes first, the verb stays second, and the person moves after it.
          </Trans>
        ) : (
          <Trans>The person comes first and the verb second.</Trans>
        )}
      </p>
    </Panel>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const secondWhy = (
      <Trans>
        The first word is not the person, so the verb comes second and the person after it.
      </Trans>
    );
    const rewrite: SentenceItem[] = ORDER_REWRITE.map(({ id, from, first, answers }) => ({
      kind: "rewrite",
      id,
      from,
      cue: (
        <Trans>
          Start with <span lang="et">{first}</span>
        </Trans>
      ),
      answers,
      src: src(answers[0] as string),
      explain: secondWhy,
    }));

    const meaningWhy: Record<(typeof ORDER_MEANING)[number]["id"], ReactNode> = {
      "kus-elad": (
        <Trans>
          In a question, the short pronoun comes right after the question word:{" "}
          <span lang="et">Kus sa elad?</span>
        </Trans>
      ),
      "tana-tootan": secondWhy,
      "mida-teed": (
        <Trans>
          Question word, pronoun, then the verb: <span lang="et">Mida sa täna teed?</span>
        </Trans>
      ),
      "homme-pean": (
        <Trans>
          <span lang="et">Pean</span> takes second place, and the other verb,{" "}
          <span lang="et">minema</span>, goes last.
        </Trans>
      ),
      "ohtul-tahan": (
        <Trans>
          <span lang="et">Tahan</span> takes second place, and <span lang="et">lugeda</span> goes
          last.
        </Trans>
      ),
      "homme-ei-tule": (
        <Trans>
          With <span lang="et">ei</span>, the person usually stays before it:{" "}
          <span lang="et">Homme me ei tule.</span>
        </Trans>
      ),
      "ohtul-ei-ole": (
        <Trans>
          With <span lang="et">ei</span>, the person usually stays before it:{" "}
          <span lang="et">Õhtul ta ei ole kodus.</span>
        </Trans>
      ),
      "laupaeval-ujuma": (
        <Trans>
          <span lang="et">Läheme</span> takes second place, and <span lang="et">ujuma</span> goes
          last.
        </Trans>
      ),
    };
    const built: OrderItem[] = ORDER_MEANING.map(({ id, answers }) => ({
      answers,
      src: src(answers[0]),
      meaning: i18n._(MEANING_PROMPTS[id]),
      explain: meaningWhy[id],
    }));

    const heard: OrderItem[] = ORDER_HEARD.map(({ said, also }) => ({
      answers: [said, ...also],
      src: src(said),
      explain: meaning(said, i18n),
    }));

    const sentences: SentenceItem[] = ORDER_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const dialogue: DialogueTurn[] = [
      { who: "them", clip: "d-liisa-1", line: ORDER_DIALOGUE["d-liisa-1"].text },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: ORDER_DIALOGUE["d-sina-1"], right: true },
          {
            line: "Homme minema pean ma tööle.",
            why: <Trans>The second verb goes last, after the place.</Trans>,
          },
          {
            line: "Eile minema pidin ma tööle.",
            why: <Trans>She asks about tomorrow, and the second verb goes last.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-liisa-2", line: ORDER_DIALOGUE["d-liisa-2"].text },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: "Õhtul kodus ma olen.", why: <Trans>The verb comes second, not last.</Trans> },
          { line: ORDER_DIALOGUE["d-sina-2"], right: true },
          {
            line: "Hommikul kodus ma olen.",
            why: <Trans>She asks about the evening, and the verb comes second.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-liisa-3", line: ORDER_DIALOGUE["d-liisa-3"].text },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ei, pühapäeval ei ma tule.",
            why: (
              <Trans>
                She asks about Saturday, and <span lang="et">ei</span> goes right before the verb.
              </Trans>
            ),
          },
          {
            line: "Ei, laupäeval ei ma tule.",
            why: (
              <Trans>
                <span lang="et">Ei</span> goes right before the verb, so the person comes before{" "}
                <span lang="et">ei</span>: <span lang="et">laupäeval ma ei tule</span>.
              </Trans>
            ),
          },
          { line: ORDER_DIALOGUE["d-sina-3"], right: true },
        ],
      },
      { who: "them", clip: "d-liisa-4", line: ORDER_DIALOGUE["d-liisa-4"].text },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          { line: ORDER_DIALOGUE["d-sina-4"], right: true },
          {
            line: "Pühapäeval tulen ei.",
            why: (
              <Trans>
                <span lang="et">Ei</span> goes right before the verb.
              </Trans>
            ),
          },
          {
            line: "Laupäeval tulen ei.",
            why: (
              <Trans>
                She asks about Sunday, and <span lang="et">ei</span> goes right before the verb.
              </Trans>
            ),
          },
        ],
      },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "morning",
        ask: t`What does Peeter do on Saturday morning?`,
        options: [
          { id: "work", label: t`He works` },
          { id: "read", label: t`He reads` },
          { id: "study", label: t`He studies` },
        ],
        answer: "work",
        line: 3,
      },
      {
        id: "until",
        ask: t`Until when does Peeter work?`,
        options: [
          { id: "one", label: t`Until one` },
          { id: "two", label: t`Until two` },
          { id: "six", label: t`Until six` },
        ],
        answer: "two",
        line: 4,
      },
      {
        id: "shop",
        kind: "truefalse",
        ask: t`After work Peeter goes to the shop.`,
        answer: true,
        line: 6,
      },
      {
        id: "time",
        kind: "short",
        ask: t`What time should Peeter come? Write the number as Liisa says it.`,
        answers: ["seitse", "7"],
        line: 13,
      },
      {
        id: "floor",
        ask: t`Which floor does Liisa live on?`,
        options: [
          { id: "first", label: t`The first` },
          { id: "second", label: t`The second` },
          { id: "third", label: t`The third` },
        ],
        answer: "third",
        line: 15,
      },
      {
        id: "jaan",
        kind: "truefalse",
        ask: t`Jaan is coming on Saturday.`,
        answer: false,
        line: 17,
      },
      {
        id: "sunday",
        ask: t`What does Peeter want to do on Sunday?`,
        options: [
          { id: "swim", label: t`Go swimming` },
          { id: "tartu", label: t`Go to Tartu` },
          { id: "shop", label: t`Go to the shop` },
        ],
        answer: "swim",
        line: 20,
      },
      {
        id: "exam-time",
        ask: t`What time is Liisa’s exam?`,
        options: [
          { id: "eleven", label: t`At eleven` },
          { id: "nine", label: t`At nine` },
          { id: "twelve", label: t`At twelve` },
        ],
        answer: "nine",
        line: 28,
      },
      {
        id: "exam",
        kind: "short",
        ask: t`What exam is it? Write it as Liisa says it.`,
        answers: ["eesti keele", "eesti keel"],
        line: 29,
      },
    ];

    return { rewrite, built, heard, sentences, dialogue, talk };
  }, [t, i18n]);
}

export function SonajargLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const questions = lessonBySlug("kusimused")?.n;
  const when = lessonBySlug("millal")?.n;
  const negation = lessonBySlug("eitus")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          In an Estonian statement the verb usually comes second. Start with a time or a place, and
          the person moves after the verb: <span lang="et">Täna lähen ma Tartusse</span>, today I’m
          going to Tartu.
        </Trans>
      }
      facts={[
        <Trans key="m">16 minutes</Trans>,
        <Trans key="q">5 exercises, 2 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["täna lähen ma", "kus sa elad?", "homme pean ma tööle minema", "täna ma ei tööta"]}
      recap={[
        <Trans key="1">
          In a statement the verb usually comes second. Start with a time or a place, and the person
          follows the verb: <b lang="et">Täna lähen ma Tartusse.</b>
        </Trans>,
        <Trans key="2">
          In a question, the short pronoun comes right after the question word:{" "}
          <b lang="et">Kus sa elad? Mida sa täna teed?</b>
        </Trans>,
        <Trans key="3">
          With two verbs, the first takes second place and the other goes last:{" "}
          <b lang="et">Homme pean ma tööle minema.</b>
        </Trans>,
        <Trans key="4">
          With <b lang="et">ei</b>, the person usually stays before it:{" "}
          <b lang="et">Täna ma ei tööta.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "second",
          title: t`The verb comes second`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <span lang="et">Ma lähen täna Tartusse</span> is I’m going to Tartu today. Start
                    it with <span lang="et">täna</span> instead, and the verb stays in second place
                    while the person moves after it: <Word w="Täna lähen ma" />{" "}
                    <span lang="et">Tartusse</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same goes for a place, or a time word from lesson {when}:{" "}
                    <span lang="et">Tartus elab Kati</span>,{" "}
                    <span lang="et">Hommikul joob Mari kohvi</span>. Switch between the two starts,
                    and tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <FrontSwitch />
              <Prose>
                <p>
                  <Trans>Now rewrite each sentence so that it starts with the word given.</Trans>
                </p>
              </Prose>
              <Quiz
                id="start-with"
                title={<Trans>Start with another word</Trans>}
                items={content.rewrite}
                rounds={content.rewrite.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: the verb second, the person after it.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check that the verb comes right after the first word.
                    </Trans>
                  ) : (
                    <Trans>Switch between the two starts above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "questions",
          title: t`Questions: where the pronoun goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A question works differently. After a question word from lesson {questions}, the
                    short pronoun, such as <span lang="et">sa</span> or <span lang="et">te</span>,
                    comes next and the verb after it: <Word w="Kus sa elad?" />, where do you live?
                    A question with <span lang="et">kas</span> puts <span lang="et">kas</span> in
                    front of a plain statement: <span lang="et">Kas sa tuled homme?</span>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So a statement says <span lang="et">Täna lähen ma</span>, and a question says{" "}
                    <span lang="et">Millal sa lähed?</span> Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(ORDER_QUESTIONS)} />
              <Prose>
                <p>
                  <Trans>
                    Build each sentence from what it means. Some are questions and some are
                    statements, so check which order each needs.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="question-or-statement"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, questions and statements each in their order.</Trans>
                  ) : (
                    <Trans>Read why under each one you missed, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "two-verbs",
          title: t`Two verbs: the second goes last`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With two verbs, as in lesson {infinitives}, the first one takes second place,
                    and the other goes to the end: <Word w="Homme pean ma tööle minema" />, tomorrow
                    I have to go to work. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(ORDER_TWO)} />
            </>
          ),
        },
        {
          id: "no",
          title: t`Saying no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With <span lang="et">ei</span> from lesson {negation}, the person usually stays
                    before it: <Word w="Täna ma ei tööta" />, today I’m not working. Tap a line to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(ORDER_NO)} />
              <Aside>
                <Trans>
                  Without <span lang="et">ei</span>, you will also hear{" "}
                  <span lang="et">Täna ma lähen</span> in speech. When you write, keep the verb
                  second: <span lang="et">Täna lähen ma</span>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Now listen, and build the sentence you hear.</Trans>
                </p>
              </Prose>
              <Quiz
                id="build-heard"
                title={<Trans>Build what you hear</Trans>}
                items={content.heard}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each with the verb in its place.</Trans>
                  ) : (
                    <Trans>Play the ones you missed and listen for where the verb is.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write it in order`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. Start with the word the English starts with.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-order"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, each in its order.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check where the verb is in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "plans",
          title: t`Plans for the weekend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Liisa asks about your plans. Pick each reply.</Trans>
                </p>
              </Prose>
              <Dialogue
                id="liisa-plans"
                title={<Trans>Talk: plans</Trans>}
                part={
                  <Trans>
                    You work tomorrow, you’re at home in the evening, you’re not coming on Saturday,
                    and you are on Sunday.
                  </Trans>
                }
                them={t`Liisa`}
                turns={content.dialogue}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Saturday and Sunday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Liisa and Peeter talk about the weekend.</Trans>
                </p>
              </Prose>
              <Listening
                id="peeter-and-liisa"
                title={<Trans>Listen: Liisa and Peeter</Trans>}
                clip="c-talk"
                turns={ORDER_TALK.turns}
                names={{ main: t`Peeter`, second: t`Liisa` }}
                questions={content.talk}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
