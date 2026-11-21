import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  OBJECT_ALWAYS,
  OBJECT_DIALOGUE,
  OBJECT_FORMS,
  OBJECT_GAPS,
  OBJECT_PAIRS,
  OBJECT_SHOP,
  OBJECT_WHOLE,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "raamatut-voi-raamatu";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  läbi: { en: msg`through, to the end`, note: msg`After a verb: lugesin läbi, I read it all.` },
  ära: { en: msg`away, all of it`, note: msg`After a verb: sõin ära, I ate it up.` },
  praegu: { en: msg`right now` },
  võti: { en: msg`key` },
  võtit: { en: msg`key, the third form`, note: msg`The third form of võti: ma otsin võtit.` },
  pilet: { en: msg`ticket` },
  kook: { en: msg`cake` },
  teed: { en: msg`tea, the third form`, note: msg`The third form of tee: ma ei taha teed.` },
  "ma ei ostnud leiba.": { en: msg`I didn’t buy bread.` },
  "ma joon kohvi.": { en: msg`I drink coffee; I’m drinking coffee.` },
  "ma ootan sõpra.": { en: msg`I’m waiting for a friend.` },
  "ma armastan sind.": { en: msg`I love you.` },
  "ma otsin võtit.": { en: msg`I’m looking for my key.` },
  "ma ostsin pileti.": { en: msg`I bought a ticket.` },
  "osta pilet!": { en: msg`Buy a ticket!` },
  "ma ostsin piletid.": { en: msg`I bought the tickets.` },
};

const PAIR_MEANS: Record<string, MessageDescriptor> = {
  bread: msg`Bread`,
  book: msg`Book`,
  cake: msg`Cake`,
  work: msg`Work`,
};

const PAIR_TIPS: Record<string, { part: MessageDescriptor; whole: MessageDescriptor }> = {
  bread: { part: msg`Some bread.`, whole: msg`A loaf, the whole of it.` },
  book: {
    part: msg`I was reading a book, maybe not to the end.`,
    whole: msg`I read the book to the end.`,
  },
  cake: { part: msg`I ate some cake.`, whole: msg`I ate the cake up.` },
  work: { part: msg`I was working, I did some work.`, whole: msg`I got the work done.` },
};

type GapRun = GapItem & { id: string; said: string };

function PairTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OBJECT_PAIRS.map((pair) => ({
    id: pair.id,
    label: i18n._(PAIR_MEANS[pair.id] as MessageDescriptor),
    cells: [
      {
        form: pair.part,
        src: src(pair.part),
        note: i18n._(PAIR_TIPS[pair.id]?.part as MessageDescriptor),
      },
      {
        form: pair.whole,
        src: src(pair.whole),
        note: i18n._(PAIR_TIPS[pair.id]?.whole as MessageDescriptor),
      },
    ],
  }));
  return (
    <Paradigm
      label={t`Part and whole`}
      columns={[t`Part: the third form`, t`Whole: the genitive`]}
      rows={rows}
      empty={{
        title: t`Tap a sentence`,
        tip: (
          <Trans>Each row says the same thing twice: once in progress or in part, once done.</Trans>
        ),
      }}
    />
  );
}

function SentenceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {items.map((said) => (
        <li key={said}>
          <Word w={said} />
        </li>
      ))}
    </ul>
  );
}

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const whys: Record<string, ReactNode> = {
      no: (
        <Trans>
          After <Et>ei</Et>, always the third form.
        </Trans>
      ),
      "not-bought": (
        <Trans>
          After <Et>ei</Et>, always the third form.
        </Trans>
      ),
      one: <Trans>One whole loaf, and it’s bought: the genitive.</Trans>,
      bought: <Trans>One whole ticket, bought: the genitive.</Trans>,
      eating: (
        <Trans>
          <Et>Praegu</Et>, right now: still eating, so the third form.
        </Trans>
      ),
      now: (
        <Trans>
          <Et>Praegu</Et>, right now: still reading, so the third form.
        </Trans>
      ),
      done: (
        <Trans>
          <Et>Läbi</Et> says to the end, so the genitive.
        </Trans>
      ),
      buy: <Trans>A command takes the dictionary form for the whole thing.</Trans>,
      eaten: (
        <Trans>
          <Et>Ära</Et> says all of it, so the genitive.
        </Trans>
      ),
    };
    const gaps: GapRun[] = OBJECT_GAPS.map((gap) => {
      const said = objectGapSaid(gap);
      return {
        id: gap.id,
        said,
        src: src(said),
        before: gap.before,
        after: gap.after,
        options: OBJECT_FORMS[gap.noun],
        answer: gap.answer,
        explain: whys[gap.id],
      };
    });

    const shop: PassageQuestion[] = [
      {
        id: "milk",
        ask: t`Did Jaan buy milk?`,
        options: [
          { id: "litre", label: t`Yes, a litre` },
          { id: "no", label: t`No, he didn’t` },
          { id: "some", label: t`Yes, some for the coffee` },
        ],
        answer: "no",
        line: 3,
      },
      {
        id: "one",
        ask: t`What did he buy just one of?`,
        options: [
          { id: "bread", label: t`A loaf of bread` },
          { id: "cheese", label: t`Cheese` },
          { id: "cake", label: t`A cake` },
        ],
        answer: "cake",
        line: 2,
      },
      {
        id: "key",
        ask: t`Did he find his key?`,
        options: [
          { id: "yes", label: t`Yes, in the shop` },
          { id: "no", label: t`No, he looked for it a long time` },
          { id: "home", label: t`Yes, at home` },
        ],
        answer: "no",
        line: 4,
      },
    ];

    const said = (clip: keyof typeof OBJECT_DIALOGUE) => {
      const line = OBJECT_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-teenindaja-1", line: said("d-teenindaja-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ma võtsin ühe kooki.",
            why: (
              <Trans>
                <Et>Võtsin</Et> is the past, and one whole cake takes the genitive:{" "}
                <Et>ma võtan ühe koogi</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-1"), right: true },
          {
            line: "Ma võtan ühe kooki.",
            why: (
              <Trans>
                One whole cake takes the genitive: <Et>ühe koogi</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-2", line: said("d-teenindaja-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: said("d-sina-2"), right: true },
          {
            line: "Ei, aitäh. Ma ei taha tee.",
            why: (
              <Trans>
                After <Et>ei</Et>, the third form: <Et>teed</Et>.
              </Trans>
            ),
          },
          {
            line: "Ei, aitäh. Ma tahan teed.",
            why: (
              <Trans>
                That says you do want tea. To say no: <Et>ma ei taha teed</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-3", line: said("d-teenindaja-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Aitäh! Ma söön kooki kohe ära.",
            why: (
              <Trans>
                <Et>Ära</Et> says all of it, so the genitive: <Et>koogi</Et>.
              </Trans>
            ),
          },
          {
            line: "Aitäh! Ma sõin kooki kohe ära.",
            why: (
              <Trans>
                <Et>Sõin</Et> is the past, and the cake has only just come. With <Et>ära</Et>, the
                genitive: <Et>koogi</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
        ],
      },
    ];

    return { gaps, shop, talk };
  }, [t]);
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function RaamatutVoiRaamatuLesson() {
  const { t } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const plural = lessonBySlug("mitmus")?.n;
  const commands = lessonBySlug("kaskiv")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The thing you act on, the object, takes the third form or the genitive. The choice says
          whether the whole thing got done.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["läbi", "ära", "praegu", "võti", "pilet", "kook"]}
      recap={[
        <Trans key="1">
          Part of it, or still going on: the third form. <b lang="et">Ma loen raamatut.</b>
        </Trans>,
        <Trans key="2">
          The whole thing, done or sure to get done: the genitive.{" "}
          <b lang="et">Ma lugesin raamatu läbi.</b>
        </Trans>,
        <Trans key="3">
          Always the third form after <b lang="et">ei</b>, after a number, and after verbs such as{" "}
          <b lang="et">ootama, armastama, otsima</b>: <b lang="et">Ma ootan sõpra.</b>
        </Trans>,
        <Trans key="4">
          In a command the whole thing takes the dictionary form, and more than one the plural with
          -d: <b lang="et">Osta pilet! Ma ostsin piletid.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "part-whole",
          title: t`Part or whole`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The object is the thing you act on: the book you read, the bread you buy. In
                    Estonian it takes one of two forms, and the choice says something English says
                    with “was reading” and “read to the end”. The third form of lesson {partitive}{" "}
                    says part of it, or not done yet. The genitive of lesson {genitive} says the
                    whole thing, done. In the present it says the whole thing will get done:{" "}
                    <Et>Ma söön koogi ära</Et>, I’ll eat the cake up.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Small words after the verb often show it’s done: <Word w="läbi" />, to the end,
                    and <Word w="ära" />, all of it.
                  </Trans>
                </p>
              </Prose>
              <PairTable />
              <Aside>
                <Trans>
                  Careful if your own language uses its genitive for part of something, as in some
                  bread: Estonian does the opposite. Its genitive is for the whole, and the third
                  form is for the part.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "always-part",
          title: t`When it’s always the third form`,
          children: (
            <Prose>
              <p>
                <Trans>
                  Four times it’s always the third form. After <Et>ei</Et>, because nothing got
                  done. After a number from two up: <Et>kaks piletit</Et>. For some of something you
                  can’t count, such as coffee. And after verbs of feeling, waiting and looking for,
                  on their own, because they don’t finish anything:{" "}
                  <Et>ootama, armastama, otsima</Et>.
                </Trans>
              </p>
              <SentenceList items={OBJECT_ALWAYS} />
            </Prose>
          ),
        },
        {
          id: "whole",
          title: t`The whole thing`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    One whole thing takes the genitive: <Word w="pilet" />, ticket, becomes{" "}
                    <Et>pileti</Et>. In a command from lesson {commands}, the whole thing takes the
                    dictionary form. More than one whole thing, without a number, takes the plural
                    with <Et>-d</Et> of lesson {plural}: <Et>piletid</Et>.
                  </Trans>
                </p>
                <SentenceList items={OBJECT_WHOLE} />
              </Prose>
              <Aside>
                <Trans>
                  You don’t need to weigh every case. Ask one question: does the whole thing get
                  done? If not, or if you can’t tell, the third form is the safe choice.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Which form?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the form that fits the words around it, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="part-or-whole"
                title={<Trans>Part or whole?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You read every clue around the gap.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look at the word before and after each gap.</Trans>
                  ) : (
                    <Trans>Tap the sentences in the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "shop",
          title: t`Jaan at the shop`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan says what he bought and what he didn’t. Listen for the third form and the
                    genitive.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-shop"
                title={<Trans>Listen: Jaan at the shop</Trans>}
                clip="p-shop"
                sentences={OBJECT_SHOP}
                questions={content.shop}
              />
            </>
          ),
        },
        {
          id: "cafe",
          title: t`At the café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You order at a café. Pick what you say back. If you pick a wrong reply, you see
                    why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="cafe-object"
                title={<Trans>Talk: at the café</Trans>}
                part={
                  <Trans>You want one cake and no tea, and you’ll eat the cake right away.</Trans>
                }
                them={t`Waiter`}
                turns={content.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
