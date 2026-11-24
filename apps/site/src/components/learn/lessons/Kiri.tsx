import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  LETTER_CONVERSATION,
  LETTER_DIALOGUE,
  LETTER_FIXES,
  LETTER_FIX_ANSWERS,
  LETTER_GAPS,
  LETTER_MESSAGE,
  LETTER_MODEL_BODY,
  LETTER_MODEL_SIGN,
  LETTER_PHRASES,
  LETTER_SPARE,
  LETTER_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Writing } from "../Writing";

const SLUG = "kiri";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const FIX_PROMPTS: Record<string, MessageDescriptor> = {
  "Kas te saaksite meistri saata?": msg`Could you send a repair person? (to Mrs Tamm)`,
  "Ma olen kodus esmaspäeval.": msg`I’m at home on Monday.`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "Kirjutan teile, sest köögis on kraan katki.": msg`I’m writing to you because the kitchen tap is broken.`,
  "Kas te saaksite meistri saata?": msg`Could you send a repair person?`,
  "Kas oleks võimalik homme tulla?": msg`Would it be possible to come tomorrow?`,
  "Ma olen kodus pärast kella viit.": msg`I’m at home after five.`,
  "Aitäh ette!": msg`Thank you in advance!`,
  Lugupidamisega: msg`Yours sincerely`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  kiri: { en: msg`letter, message` },
  üürileandja: {
    en: msg`landlord, landlady`,
    note: msg`Literally “the one who gives for rent”: üürile andma is to rent out.`,
  },
  kraan: { en: msg`tap, faucet` },
  katki: {
    en: msg`broken`,
    note: msg`Katki minema is to break: kraan on katki läinud, the tap has broken.`,
  },
  meister: { en: msg`repair person, craftsman` },
  parandama: { en: msg`to repair, to fix` },
  tilkuma: { en: msg`to drip`, note: msg`Vesi tilgub, the water drips.` },
};

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const message: PassageQuestion[] = [
      {
        id: "broken",
        ask: t`What has broken?`,
        options: [
          { id: "tap", label: t`The kitchen tap` },
          { id: "light", label: t`The bathroom light` },
          { id: "lock", label: t`The lock` },
        ],
        answer: "tap",
        line: 2,
      },
      {
        id: "how-long",
        kind: "short",
        ask: t`How long has the water been dripping? Write it as Kati does.`,
        answers: ["kolm päeva", "3 päeva"],
        line: 3,
      },
      {
        id: "tried",
        kind: "truefalse",
        ask: t`Kati tried to fix the tap herself.`,
        answer: true,
        line: 4,
      },
      {
        id: "home",
        ask: t`When is Kati at home?`,
        options: [
          { id: "all-day", label: t`All day on Wednesday` },
          { id: "evenings", label: t`On Monday and Tuesday after five` },
          { id: "weekend", label: t`At the weekend` },
        ],
        answer: "evenings",
        line: 7,
      },
      {
        id: "neighbour",
        kind: "short",
        ask: t`Who can let the repair person in on Wednesday? Write the name.`,
        answers: ["Jaan"],
        line: 9,
      },
      {
        id: "lamp",
        kind: "truefalse",
        ask: t`The bathroom light doesn’t work at all.`,
        answer: false,
        line: 12,
      },
      {
        id: "contact",
        ask: t`How should Mrs Tamm get in touch?`,
        options: [
          { id: "write", label: t`Write back by email or post` },
          { id: "phone", label: t`Phone in the evening` },
          { id: "come", label: t`Come round on Monday morning, before work` },
        ],
        answer: "phone",
        line: 14,
      },
    ];

    const gaps: GapItem[] = LETTER_GAPS.map((gap) => ({ ...gap }));

    const fixWhy: Record<string, ReactNode> = {
      "Kas te saaksite meistri saata?": (
        <Trans>
          For <b lang="et">te</b>, the would form ends in <b lang="et">-te</b>:{" "}
          <b lang="et">saaksite</b>.
        </Trans>
      ),
      "Ma helistan teile homme.": (
        <Trans>
          <b lang="et">Helistama</b> asks <b lang="et">kellele?</b>, to whom: <b lang="et">teile</b>
          .
        </Trans>
      ),
      "Kraan on katki läinud.": (
        <Trans>
          The <b lang="et">-nud</b> form of <b lang="et">minema</b> is <b lang="et">läinud</b>.
        </Trans>
      ),
      "Vesi tilgub juba kolm päeva.": (
        <Trans>
          After <b lang="et">kolm</b>, the partitive singular: <b lang="et">kolm päeva</b>.
        </Trans>
      ),
      "Ma olen kodus esmaspäeval.": (
        <Trans>
          On a day is usually <b lang="et">-l</b>: <b lang="et">esmaspäeval</b>.
        </Trans>
      ),
      "Ma ootan teie vastust.": (
        <Trans>
          <b lang="et">Ootama</b> usually takes the partitive: <b lang="et">vastust</b>.
        </Trans>
      ),
      "Ma olen teile väga tänulik.": (
        <Trans>
          One person, so the singular: <b lang="et">tänulik</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = LETTER_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.right]
        ? i18n._(FIX_PROMPTS[item.right] as MessageDescriptor)
        : undefined,
      answers: LETTER_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "broken",
        prompt: t`Our kitchen tap is broken.`,
        src: src("Meie köögis on kraan katki."),
        answers: LETTER_ANSWERS["Meie köögis on kraan katki."],
        pair: ["what", "broken"],
      },
      {
        kind: "translate",
        id: "send",
        prompt: t`Could you send a repair person?`,
        src: src("Kas te saaksite meistri saata?"),
        answers: LETTER_ANSWERS["Kas te saaksite meistri saata?"],
        pair: ["ask", "send"],
        explain: (
          <Trans>
            The would form asks politely: <b lang="et">saaksite</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "home",
        prompt: t`I’m at home on Monday after five.`,
        src: src("Ma olen esmaspäeval pärast kella viit kodus."),
        answers: LETTER_ANSWERS["Ma olen esmaspäeval pärast kella viit kodus."],
        pair: ["when", "home"],
      },
      {
        kind: "translate",
        id: "thanks",
        prompt: t`Thank you in advance!`,
        src: src("Aitäh ette!"),
        answers: LETTER_ANSWERS["Aitäh ette!"],
        pair: ["end", "thanks"],
      },
      {
        kind: "translate",
        id: "phone",
        prompt: t`Please phone me in the evening.`,
        src: src("Palun helistage mulle õhtul."),
        answers: LETTER_ANSWERS["Palun helistage mulle õhtul."],
        pair: ["ask", "phone"],
      },
      {
        kind: "translate",
        id: "dripping",
        prompt: t`The water has been dripping for three days.`,
        src: src("Vesi tilgub juba kolm päeva."),
        answers: LETTER_ANSWERS["Vesi tilgub juba kolm päeva."],
        pair: ["what", "dripping"],
        explain: (
          <Trans>
            Estonian can say it in the present, with <b lang="et">juba</b>: already.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "regards",
        prompt: t`Yours sincerely`,
        src: src("Lugupidamisega"),
        answers: LETTER_ANSWERS["Lugupidamisega"],
        pair: ["end", "regards"],
      },
    ];

    const line = (id: keyof typeof LETTER_DIALOGUE) => {
      const clip = LETTER_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-meister-1", line: line("d-meister-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Köögis on kraan katki minnud.",
            why: (
              <Trans>
                The <b lang="et">-nud</b> form of <b lang="et">minema</b> is <b lang="et">läinud</b>
                .
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Vannitoas on kraan katki minnud.",
            why: (
              <Trans>
                The tap is in the kitchen, and the <b lang="et">-nud</b> form of{" "}
                <b lang="et">minema</b> is <b lang="et">läinud</b>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-meister-2", line: line("d-meister-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: line("d-sina-2"), right: true },
          {
            line: "Jah, ma olen selle juba ära parandanud.",
            why: <Trans>You haven’t touched the tap.</Trans>,
          },
          {
            line: "Ei, ma ei ole seda parandama.",
            why: (
              <Trans>
                To say you haven’t done it, <b lang="et">ei ole</b> takes the <b lang="et">-nud</b>{" "}
                form: <b lang="et">parandanud</b>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-meister-3", line: line("d-meister-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Jah, hommikul sobib.",
            why: <Trans>You’re at work in the mornings.</Trans>,
          },
          {
            line: "Tulge pigem õhtul!",
            why: (
              <Trans>
                That sounds like an order. Ask with the would form: <b lang="et">saaksite</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-3"), right: true },
        ],
      },
      { who: "them", clip: "d-meister-4", line: line("d-meister-4") },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          {
            line: "Aitäh, ma ootan teile.",
            why: (
              <Trans>
                <b lang="et">Ootama</b> usually takes the partitive: <b lang="et">teid</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-4"), right: true },
          {
            line: "Aitäh, ma ootan teiega.",
            why: (
              <Trans>
                <b lang="et">Teiega</b> is with you: you’d wait together. <b lang="et">Ootama</b>{" "}
                usually takes the partitive: <b lang="et">teid</b>.
              </Trans>
            ),
          },
        ],
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "why",
        ask: t`Why does Jaan phone?`,
        options: [
          { id: "radiator", label: t`The living-room radiator is cold` },
          { id: "lock", label: t`The front door won’t lock` },
          { id: "noise", label: t`A noisy neighbour` },
        ],
        answer: "radiator",
        line: 4,
      },
      {
        id: "degrees",
        kind: "short",
        ask: t`How warm is the room at night? Write the number as Jaan says it.`,
        answers: ["viisteist", "15", "viisteist kraadi", "15 kraadi"],
        line: 6,
      },
      {
        id: "tried",
        kind: "truefalse",
        ask: t`Jaan tried to fix the radiator himself.`,
        answer: true,
        line: 9,
      },
      {
        id: "neighbour",
        kind: "short",
        ask: t`Who will let the repair person in? Write the name.`,
        answers: ["Mari"],
        line: 14,
      },
      {
        id: "when",
        ask: t`When will the repair person come?`,
        options: [
          { id: "thu-two", label: t`On Thursday at two` },
          { id: "thu-four", label: t`On Thursday at four, after work` },
          { id: "friday", label: t`On Friday` },
        ],
        answer: "thu-two",
        line: 18,
      },
      {
        id: "pay",
        kind: "truefalse",
        ask: t`Jaan has to pay the repair person.`,
        answer: false,
        line: 28,
      },
      {
        id: "friday",
        ask: t`What will Jaan do on Friday?`,
        options: [
          { id: "rent", label: t`Pay the rent for the whole month` },
          { id: "message", label: t`Send Mrs Tamm a message` },
          { id: "tap", label: t`Fix the kitchen tap himself` },
        ],
        answer: "message",
        line: 30,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "tamm", label: t`Mrs Tamm` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "cold", label: t`That’s too cold, sorry.`, answer: "tamm", line: 7 },
          { id: "work", label: t`I’m at work until four.`, answer: "jaan", line: 13 },
          { id: "tap", label: t`The kitchen tap drips too.`, answer: "jaan", line: 20 },
          { id: "write", label: t`Please write to me afterwards.`, answer: "tamm", line: 29 },
          { id: "suits", label: t`Yes, that suits me.`, answer: "tamm", line: 38 },
        ],
      },
    ];

    const points: { id: string; label: ReactNode }[] = [
      { id: "greet", label: t`Greet Mr Saar by name.` },
      { id: "what", label: t`Say what is broken, and since when.` },
      { id: "ask", label: t`Ask politely for an electrician.` },
      { id: "when", label: t`Say when you’re at home.` },
      { id: "end", label: t`Thank him and sign off.` },
    ];
    const checks: { id: string; label: ReactNode }[] = [
      {
        id: "greet",
        label: (
          <Trans>
            It starts with <b lang="et">Tere</b> and his name.
          </Trans>
        ),
      },
      { id: "what", label: t`It says what is broken and since when.` },
      {
        id: "ask",
        label: (
          <Trans>
            It asks with the would form, such as <b lang="et">saaksite</b>.
          </Trans>
        ),
      },
      { id: "when", label: t`It says when you’re at home: the days or times.` },
      {
        id: "end",
        label: (
          <Trans>
            It ends with thanks and <b lang="et">Lugupidamisega</b>.
          </Trans>
        ),
      },
      {
        id: "verbs",
        label: (
          <Trans>
            Each verb after <b lang="et">ma</b> or <b lang="et">te</b> has its ending:{" "}
            <b lang="et">olen</b>, <b lang="et">saaksite</b>.
          </Trans>
        ),
      },
    ];

    return { message, gaps, fixes, translations, talk, exam, points, checks };
  }, [t, i18n]);
}

export function KiriLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const conditional = lessonBySlug("laheksin")?.n;
  const names = { second: t`Mrs Tamm`, main: t`Jaan` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Write a short message to your landlord: what’s broken, a polite request, when you’re home.
          Read one, hear a phone call, then write your own.
        </Trans>
      }
      facts={[
        <Trans key="m">25 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kiri", "üürileandja", "kraan", "katki", "meister", "parandama", "tilkuma"]}
      recap={[
        <Trans key="1">
          Start with a greeting and the reason: <b lang="et">Tere, proua Tamm!</b>{" "}
          <b lang="et">Kirjutan teile, sest …</b>
        </Trans>,
        <Trans key="2">
          Ask with the would form and <b lang="et">te</b>:{" "}
          <b lang="et">Kas te saaksite meistri saata?</b>
        </Trans>,
        <Trans key="3">
          Say when, on which days: <b lang="et">Ma olen kodus esmaspäeval pärast kella viit.</b>
        </Trans>,
        <Trans key="4">
          End with thanks and a sign-off: <b lang="et">Aitäh ette!</b> Then{" "}
          <b lang="et">Lugupidamisega</b> with no comma, and your name on the next line.
        </Trans>,
      ]}
      sections={[
        {
          id: "message",
          title: t`Kati writes to her landlady`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati’s kitchen tap has broken. Read her message to the landlady, Mrs Tamm, then
                    answer the questions.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-message"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-message"
                sentences={LETTER_MESSAGE}
                questions={content.message}
              />
            </>
          ),
        },
        {
          id: "phrases",
          title: t`Phrases for a message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A message to a landlord, a school or a doctor usually uses <b lang="et">te</b>{" "}
                    and the would form from lesson {conditional}. These phrases carry most of it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(LETTER_PHRASES)} />
              <Aside>
                <Trans>
                  <b lang="et">Lugupidamisega</b> is formal. To a friend, end with{" "}
                  <b lang="et">Kallistades</b> or just your name.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Write each line in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-message"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each ready for a message.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Listen to the phrases above once more.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={pairRun}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "friend",
          title: t`Kati tells a friend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes to a friend about the tap. Drag a word into each gap, or tap one to
                    fill the open gap. Three of the words belong nowhere.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-friend"
                title={<Trans>Fill the gaps</Trans>}
                gaps={content.gaps}
                mode="drag"
                spare={LETTER_SPARE}
                clip="p-friend"
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Check the message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each line from a message has one word in the wrong form. Tap it, then type it
                    right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-message"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you got wrong.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "repair",
          title: t`The repair person calls`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The repair person phones you. Pick what you say back. A wrong reply says why,
                    then you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="repair-call"
                title={<Trans>Talk: the repair person</Trans>}
                part={
                  <Trans>
                    Your kitchen tap is broken and you haven’t touched it. You’re at work in the
                    mornings, and you’ll wait for him to come.
                  </Trans>
                }
                them={t`Repair person`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "radiator",
          title: t`Jaan phones his landlady`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Jaan’s radiator is cold. He phones Mrs Tamm.</Trans>
                </p>
              </Prose>
              <Listening
                id="radiator-call"
                title={<Trans>Listen: Mrs Tamm and Jaan</Trans>}
                clip="c-radiator"
                turns={LETTER_CONVERSATION.turns}
                names={names}
                questions={content.exam}
                plays={2}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Your message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now write your own. Nothing marks it: once you’ve written it, compare it with a
                    model and tick what yours does.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="landlord-message"
                title={<Trans>Write to your landlord</Trans>}
                prompt={
                  <>
                    <p>
                      <Trans>
                        The light in your bathroom stopped working last night. Write about 50 words
                        to your landlord, Mr Saar.
                      </Trans>
                    </p>
                    <ul className="m-0 mt-2 grid list-disc gap-1 ps-5">
                      {content.points.map((point) => (
                        <li key={point.id}>{point.label}</li>
                      ))}
                    </ul>
                  </>
                }
                model={LETTER_MODEL_BODY}
                signOff={["Aitäh ette!", ...LETTER_MODEL_SIGN]}
                src={src("p-model")}
                checks={content.checks}
              />
            </>
          ),
        },
      ]}
    />
  );
}
