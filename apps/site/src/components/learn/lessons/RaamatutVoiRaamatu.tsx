import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  OBJECT_COMMANDS,
  OBJECT_CONVERSATION,
  OBJECT_DIALOGUE,
  OBJECT_FIXES,
  OBJECT_FIX_ANSWERS,
  OBJECT_FORM_QUIZ,
  OBJECT_FOUND,
  OBJECT_HEARD,
  OBJECT_NO,
  OBJECT_NOW,
  OBJECT_PAIRS,
  OBJECT_REWRITE,
  OBJECT_VERBS,
  OBJECT_VOICE,
  OBJECT_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "raamatut-voi-raamatu";

const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Ma ostsin leiba.": msg`I bought some bread.`,
  "Ma ostsin leiva.": msg`I bought a loaf of bread.`,
  "Ma lugesin raamatut.": msg`I was reading a book.`,
  "Ma lugesin raamatu läbi.": msg`I read the book to the end.`,
  "Ma sõin kooki.": msg`I ate some cake.`,
  "Ma sõin koogi ära.": msg`I ate the whole cake.`,
  "Ma tegin tööd.": msg`I was working.`,
  "Ma tegin töö ära.": msg`I got the work done.`,
  "Ma jõin vett.": msg`I drank some water.`,
  "Ma jõin vee ära.": msg`I drank all the water.`,
  "Ma loen raamatut.": msg`I’m reading a book.`,
  "Ma loen raamatu läbi.": msg`I’ll read the book to the end.`,
  "Ma söön suppi.": msg`I’m having some soup.`,
  "Ma söön supi ära.": msg`I’ll eat all the soup.`,
  "Ma teen tööd.": msg`I’m working.`,
  "Ma teen töö ära.": msg`I’ll get the work done.`,
  "Ma ei osta piletit.": msg`I’m not buying a ticket.`,
  "Ma ei ostnud piletit.": msg`I didn’t buy a ticket.`,
  "Ma ei ostnud leiba.": msg`I didn’t buy bread.`,
  "Ta ei lugenud raamatut.": msg`He or she didn’t read the book.`,
  "Ma ootan sõpra.": msg`I’m waiting for a friend.`,
  "Ma aitan last.": msg`I’m helping the child.`,
  "Jaan armastab Marit.": msg`Jaan loves Mari.`,
  "Ma otsin võtit.": msg`I’m looking for my key.`,
  "Ma otsisin võtit.": msg`I was looking for my key.`,
  "Ma leidsin võtme.": msg`I found my key.`,
  "Ma ostsin pileti.": msg`I bought a ticket.`,
  "Osta pilet!": msg`Buy a ticket!`,
  "Ära osta piletit!": msg`Don’t buy a ticket!`,
  "Loe raamat läbi!": msg`Read the book to the end!`,
  "Ära loe raamatut!": msg`Don’t read the book!`,
  "Ma sõin supi ära.": msg`I ate all the soup.`,
  "Söö supp ära!": msg`Eat up the soup!`,
  "Ära söö suppi!": msg`Don’t eat the soup!`,
  "Joo vesi ära!": msg`Drink up the water!`,
  "Ära joo vett!": msg`Don’t drink the water!`,
  "Ma ostsin piletid.": msg`I bought the tickets.`,
  "Osta piletid!": msg`Buy the tickets!`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  läbi: {
    en: msg`through, to the end`,
    note: msg`After a verb: lugesin läbi, I read it to the end.`,
  },
  ära: {
    en: msg`away, all of it`,
    note: msg`After a verb: sõin ära, I ate it all. Before a verb it means don’t: ära osta.`,
  },
  pilet: { en: msg`ticket`, note: msg`Pilet, pileti, piletit.` },
  kook: { en: msg`cake`, note: msg`Kook, koogi, kooki.` },
  koogi: { en: msg`cake`, note: msg`The genitive of kook.` },
  võti: { en: msg`key`, note: msg`Võti, võtme, võtit.` },
  supp: { en: msg`soup`, note: msg`Supp, supi, suppi.` },
  ootama: { en: msg`to wait, to wait for` },
  aitama: { en: msg`to help` },
  armastama: { en: msg`to love` },
  otsima: { en: msg`to look for` },
  leidma: { en: msg`to find`, note: msg`Past: leidsin, I found.` },
};

type DoneKind = "part" | "whole" | "now" | "will";

const DONE_MEANS: Record<
  (typeof OBJECT_HEARD)[number]["noun"],
  Record<DoneKind, MessageDescriptor>
> = {
  ostma: {
    part: msg`Liis bought some bread.`,
    whole: msg`Liis bought a loaf of bread.`,
    now: msg`Liis is buying some bread.`,
    will: msg`Liis will buy a loaf of bread.`,
  },
  kirjutama: {
    part: msg`Mari was writing a book.`,
    whole: msg`Mari wrote a book.`,
    now: msg`Mari is writing a book.`,
    will: msg`Mari will write a book.`,
  },
  parandama: {
    part: msg`Jaan was repairing the car.`,
    whole: msg`Jaan repaired the car.`,
    now: msg`Jaan is repairing the car.`,
    will: msg`Jaan will repair the car.`,
  },
  ehitama: {
    part: msg`Dad was building a summer house.`,
    whole: msg`Dad built a summer house.`,
    now: msg`Dad is building a summer house.`,
    will: msg`Dad will build a summer house.`,
  },
  tegema: {
    part: msg`Kati was making a salad.`,
    whole: msg`Kati made a salad.`,
    now: msg`Kati is making a salad.`,
    will: msg`Kati will make a salad.`,
  },
};

const KINDS: readonly DoneKind[] = ["part", "whole", "now", "will"];

const NOUN_MEANS: Record<(typeof OBJECT_FORM_QUIZ)[number]["noun"], MessageDescriptor> = {
  pilet: msg`ticket`,
  sõber: msg`friend`,
  võti: msg`key`,
  laps: msg`child`,
  kook: msg`cake`,
  töö: msg`work`,
};

export function litObject(text: string, object: string): string {
  const bare = text.replace(/[.!?]$/, "");
  const at = bare.lastIndexOf(object);
  return at < 0 ? bare : `${bare.slice(0, at)}|${bare.slice(at)}`;
}

export function objectOf(text: string): string {
  const words = text.replace(/[.!?]$/, "").split(" ");
  const last = words.at(-1) ?? "";
  return (["läbi", "ära"].includes(last) ? words.at(-2) : last) ?? "";
}

const NOUNS: Record<string, { et: string; en: MessageDescriptor }> = {
  leib: { et: "leib", en: msg`bread` },
  raamat: { et: "raamat", en: msg`book` },
  kook: { et: "kook", en: msg`cake` },
  too: { et: "töö", en: msg`work` },
  vesi: { et: "vesi", en: msg`water` },
  supp: { et: "supp", en: msg`soup` },
  pilet: { et: "pilet", en: msg`ticket` },
};

const noun = (id: string, i18n: I18n) => {
  const found = NOUNS[id];
  return found ? { label: i18n._(found.en), et: found.et } : { label: id };
};

const row = (text: string, i18n: I18n) => ({
  form: litObject(text, objectOf(text)),
  src: src(text),
  note: means(text, i18n),
});

function PairTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OBJECT_PAIRS.map((pair) => ({
    id: pair.id,
    ...noun(pair.id, i18n),
    cells: [row(pair.part, i18n), row(pair.whole, i18n)],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`One sentence with the partitive and with the genitive`}
        columns={[t`Partitive: part, or not said to be finished`, t`Genitive: the whole, done`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: t`Each row uses one verb twice: once for part of it or an unfinished action, once for all of it, done.`,
        }}
      />
    </Panel>
  );
}

function NowTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OBJECT_NOW.map((pair) => ({
    id: pair.id,
    ...noun(pair.id, i18n),
    cells: [row(pair.part, i18n), row(pair.whole, i18n)],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Sentences in the present, going on and to be done`}
        columns={[t`Going on now`, t`Will be done`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip: t`The verb is in the present in both columns. The object says whether it gets done.`,
        }}
      />
    </Panel>
  );
}

function CommandTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OBJECT_COMMANDS.map((command) => ({
    id: command.id,
    ...noun(command.id, i18n),
    cells: [row(command.done, i18n), row(command.go, i18n), row(command.not, i18n)],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`A sentence, a command and a don’t`}
        columns={[t`I did it`, t`Do it!`, t`Don’t!`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip: t`Compare the object across each row: genitive, nominative, partitive.`,
        }}
      />
    </Panel>
  );
}

type HeardItem = ChoiceItem & { said: string; kind: DoneKind; pair: readonly [string, string] };

export const heardOptions = (
  noun: (typeof OBJECT_HEARD)[number]["noun"],
  kinds: readonly DoneKind[],
  i18n: I18n,
) =>
  kinds.map((kind) => ({
    id: kind,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(DONE_MEANS[noun][kind])}
      </span>
    ),
  }));

export const heardRun = <T extends { pair: readonly [string, string]; options: unknown }>(
  items: readonly T[],
  pinned: T | undefined,
  reorder: (item: T) => T,
): T[] => eachPairFirst(items, pinned).map((item) => (item === pinned ? item : reorder(item)));

type FormRun = FormItem & { pair: readonly [string, string] };
type WrittenRun<T> = T & { pair: readonly [string, string] };

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const heard: HeardItem[] = OBJECT_HEARD.flatMap((group) =>
      KINDS.map((kind) => ({
        said: group[kind],
        kind,
        src: src(group[kind]),
        answer: kind,
        options: heardOptions(group.noun, KINDS, i18n),
        pair: [kind, group[kind]] as const,
        explain:
          kind === "part" ? (
            <Trans>The past with the partitive: some of it, or not finished.</Trans>
          ) : kind === "whole" ? (
            <Trans>The past with the genitive: all of it, done.</Trans>
          ) : kind === "now" ? (
            <Trans>The present with the partitive: going on now.</Trans>
          ) : (
            <Trans>The present with the genitive: it will get done.</Trans>
          ),
      })),
    );

    const noFirst = (
      <Trans>
        After <b lang="et">ei</b>, the partitive.
      </Trans>
    );
    const allOfIt = (
      <Trans>
        <b lang="et">Ära</b> says all of it: the genitive.
      </Trans>
    );
    const always = (verb: string) => (
      <Trans>
        On its own, <b lang="et">{verb}</b> takes the partitive.
      </Trans>
    );
    const formWhy: Record<string, ReactNode> = {
      "Ma ei ostnud piletit.": noFirst,
      "Ma ostsin ühe pileti.": <Trans>One whole ticket, bought: the genitive.</Trans>,
      "Ma ootan sõpra.": always("ootama"),
      "Ma otsin võtit.": always("otsima"),
      "Ma leidsin võtme.": <Trans>Finding ends the looking: the genitive.</Trans>,
      "Ma aitan last.": always("aitama"),
      "Me ei söönud kooki.": noFirst,
      "Me sõime koogi ära.": allOfIt,
      "Ma ei teinud tööd.": noFirst,
      "Ta tegi töö ära.": (
        <Trans>
          <b lang="et">Ära</b> says all of it: the genitive, which for <b lang="et">töö</b> looks
          like the nominative.
        </Trans>
      ),
    };
    const forms: FormRun[] = OBJECT_FORM_QUIZ.map((item) => ({
      base: item.noun,
      gloss: i18n._(NOUN_MEANS[item.noun]),
      cue: item.cue,
      cueLang: "et",
      answers: [item.answer],
      src: src(item.said),
      said: item.said,
      explain: formWhy[item.said],
      pair: [item.noun, item.said] as const,
    }));

    const rewrites: WrittenRun<SentenceItem>[] = OBJECT_REWRITE.map((item) => ({
      kind: "rewrite",
      id: clipId(item.to),
      from: item.from,
      cue: item.not ? t`tell a friend not to` : t`tell a friend to`,
      src: src(item.to),
      answers: OBJECT_ANSWERS[item.to] ?? [item.to],
      pair: [item.not ? "not" : "do", item.to] as const,
      explain: item.not ? (
        <Trans>
          Don’t is <b lang="et">ära</b> before the verb, and after a no the object takes the
          partitive.
        </Trans>
      ) : (
        <Trans>A command for the whole thing: the noun takes the nominative.</Trans>
      ),
    }));

    const translations: WrittenRun<SentenceItem>[] = [
      {
        kind: "translate",
        id: "was-reading",
        prompt: t`I was reading a book.`,
        src: src("Ma lugesin raamatut."),
        answers: OBJECT_ANSWERS["Ma lugesin raamatut."],
        pair: ["done", "was-reading"],
        explain: <Trans>Going on, not said to be finished: the partitive.</Trans>,
      },
      {
        kind: "translate",
        id: "read-through",
        prompt: t`I read the book to the end.`,
        src: src("Ma lugesin raamatu läbi."),
        answers: OBJECT_ANSWERS["Ma lugesin raamatu läbi."],
        pair: ["done", "read-through"],
        explain: (
          <Trans>
            To the end is <b lang="et">läbi</b>, with the genitive.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "will-finish",
        prompt: t`I’ll get the work done.`,
        src: src("Ma teen töö ära."),
        answers: OBJECT_ANSWERS["Ma teen töö ära."],
        pair: ["done", "will-finish"],
        explain: <Trans>The present with the genitive says it will get done.</Trans>,
      },
      {
        kind: "translate",
        id: "some-bread",
        prompt: t`I bought some bread.`,
        src: src("Ma ostsin leiba."),
        answers: OBJECT_ANSWERS["Ma ostsin leiba."],
        pair: ["some", "some-bread"],
        explain: <Trans>Some of it: the partitive.</Trans>,
      },
      {
        kind: "translate",
        id: "a-loaf",
        prompt: t`I bought a loaf of bread.`,
        src: src("Ma ostsin leiva."),
        answers: OBJECT_ANSWERS["Ma ostsin leiva."],
        pair: ["some", "a-loaf"],
        explain: <Trans>One whole loaf: the genitive.</Trans>,
      },
      {
        kind: "translate",
        id: "no-ticket",
        prompt: t`I didn’t buy a ticket.`,
        src: src("Ma ei ostnud piletit."),
        answers: OBJECT_ANSWERS["Ma ei ostnud piletit."],
        pair: ["no", "no-ticket"],
        explain: (
          <Trans>
            After <b lang="et">ei</b>, the partitive.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "waiting",
        prompt: t`I’m waiting for a friend.`,
        src: src("Ma ootan sõpra."),
        answers: OBJECT_ANSWERS["Ma ootan sõpra."],
        pair: ["verbs", "waiting"],
        explain: (
          <Trans>
            On its own, <b lang="et">ootama</b> takes the partitive.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "looking",
        prompt: t`I’m looking for my key.`,
        src: src("Ma otsin võtit."),
        answers: OBJECT_ANSWERS["Ma otsin võtit."],
        pair: ["verbs", "looking"],
        explain: (
          <Trans>
            On its own, <b lang="et">otsima</b> takes the partitive.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "found",
        prompt: t`I found my key.`,
        src: src("Ma leidsin võtme."),
        answers: OBJECT_ANSWERS["Ma leidsin võtme."],
        pair: ["verbs", "found"],
        explain: <Trans>Finding ends the looking: the genitive.</Trans>,
      },
      {
        kind: "translate",
        id: "eat-up",
        prompt: t`Eat up the soup!`,
        src: src("Söö supp ära!"),
        answers: OBJECT_ANSWERS["Söö supp ära!"],
        pair: ["command", "eat-up"],
        explain: <Trans>A command for the whole thing: the nominative.</Trans>,
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Ma ei ostnud piletit.": (
        <Trans>
          After <b lang="et">ei</b>, the partitive: <b lang="et">piletit</b>.
        </Trans>
      ),
      "Ma ootan sõpra.": (
        <Trans>
          On its own, <b lang="et">ootama</b> takes the partitive: <b lang="et">sõpra</b>.
        </Trans>
      ),
      "Ma otsin võtit.": (
        <Trans>
          On its own, <b lang="et">otsima</b> takes the partitive: <b lang="et">võtit</b>.
        </Trans>
      ),
      "Ma lugesin raamatu läbi.": (
        <Trans>
          <b lang="et">Läbi</b> says to the end, so the genitive: <b lang="et">raamatu</b>.
        </Trans>
      ),
      "Ma ostsin ühe leiva.": (
        <Trans>
          One whole loaf takes the genitive: <b lang="et">ühe leiva</b>.
        </Trans>
      ),
      "Ma sõin koogi ära.": (
        <Trans>
          <b lang="et">Ära</b> says all of it, so the genitive: <b lang="et">koogi</b>.
        </Trans>
      ),
      "Osta pilet!": (
        <Trans>
          A command for the whole thing takes the nominative: <b lang="et">pilet</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = OBJECT_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: OBJECT_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const voice: PassageQuestion[] = [
      {
        id: "one",
        ask: t`What did Liisa buy just one of?`,
        options: [
          { id: "bread", label: t`Bread` },
          { id: "cake", label: t`A big cake` },
          { id: "cheese", label: t`A big piece of cheese` },
        ],
        answer: "cake",
        line: 2,
      },
      {
        id: "milk",
        ask: t`Did she buy milk?`,
        options: [
          { id: "litre", label: t`Yes, a litre` },
          { id: "some", label: t`Yes, a little` },
          { id: "no", label: t`No` },
        ],
        answer: "no",
        line: 3,
      },
      { id: "key", kind: "truefalse", ask: t`Liisa has found her key.`, answer: false, line: 4 },
      {
        id: "ask",
        ask: t`What does she ask you?`,
        options: [
          { id: "help", label: t`To help her find her key` },
          { id: "buy", label: t`To buy some milk` },
          { id: "eat", label: t`To eat the cake` },
        ],
        answer: "help",
        line: 5,
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "book",
        kind: "truefalse",
        ask: t`Jaan has finished Mari’s book.`,
        answer: false,
        line: 3,
      },
      {
        id: "why-work",
        ask: t`Why did Jaan work all day?`,
        options: [
          { id: "ill", label: t`A colleague was ill` },
          { id: "boss", label: t`His boss asked him to` },
          { id: "report", label: t`He had a big report to finish` },
        ],
        answer: "ill",
        line: 7,
      },
      {
        id: "how-long",
        kind: "short",
        ask: t`How long did Jaan look for his key? Write it as he says it.`,
        answers: ["pool tundi"],
        line: 8,
      },
      {
        id: "where",
        ask: t`Where was the key?`,
        options: [
          { id: "table", label: t`On the kitchen table` },
          { id: "pocket", label: t`In his pocket` },
          { id: "work", label: t`At work` },
        ],
        answer: "table",
        line: 10,
      },
      {
        id: "one-whole",
        ask: t`Mari bought several things. Which did she buy one whole one of?`,
        options: [
          { id: "bread", label: t`Bread` },
          { id: "cake", label: t`A cake` },
          { id: "cheese", label: t`Some cheese` },
        ],
        answer: "cake",
        line: 14,
      },
      {
        id: "milk",
        kind: "truefalse",
        ask: t`Mari bought milk.`,
        answer: false,
        line: 16,
      },
      {
        id: "cake",
        kind: "truefalse",
        ask: t`Mari hasn’t eaten the cake yet.`,
        answer: true,
        line: 18,
      },
      {
        id: "friend",
        kind: "short",
        ask: t`Who is Mari waiting for? Write the name as she says it.`,
        answers: ["Katit", "Kati"],
        line: 21,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who did it, or will do it?`,
        options: [
          { id: "mari", label: t`Mari` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "worked", label: t`Worked all day`, answer: "jaan", line: 7 },
          { id: "soup", label: t`Ate all the soup`, answer: "jaan", line: 12 },
          { id: "shop", label: t`Bought a cake`, answer: "mari", line: 14 },
          { id: "friend", label: t`Is waiting for a friend tonight`, answer: "mari", line: 19 },
          { id: "flowers", label: t`Will buy the flowers`, answer: "jaan", line: 27 },
        ],
      },
    ];

    const line = (id: keyof typeof OBJECT_DIALOGUE) => {
      const clip = OBJECT_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-teenindaja-1", line: line("d-teenindaja-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ma võtan ühe kooki, palun.",
            why: (
              <Trans>
                One whole cake takes the genitive: <b lang="et">ühe koogi</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Ei, aitäh, ma ei taha midagi.",
            why: <Trans>You want a cake.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-2", line: line("d-teenindaja-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, palun, üks tee.",
            why: <Trans>You don’t want tea.</Trans>,
          },
          {
            line: "Ei, aitäh. Ma ei taha tee.",
            why: (
              <Trans>
                After <b lang="et">ei</b>, the partitive: <b lang="et">teed</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-teenindaja-3", line: line("d-teenindaja-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          { line: line("d-sina-3"), right: true },
          {
            line: "Jah, ma otsin oma võtme.",
            why: (
              <Trans>
                On its own, <b lang="et">otsima</b> takes the partitive: <b lang="et">võtit</b>.
              </Trans>
            ),
          },
          {
            line: "Ei, ma leidsin kõik.",
            why: <Trans>You haven’t found your key yet.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-4", line: line("d-teenindaja-4") },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          {
            line: "Jah, ma sõin kooki eile.",
            why: <Trans>The cake has only just come, and you’ll eat all of it now.</Trans>,
          },
          { line: line("d-sina-4"), right: true },
          {
            line: "Jah, ma söön kooki kohe ära.",
            why: (
              <Trans>
                <b lang="et">Ära</b> says all of it, so the genitive: <b lang="et">koogi</b>.
              </Trans>
            ),
          },
        ],
      },
    ];

    return { heard, forms, rewrites, translations, fixes, voice, exam, talk };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function RaamatutVoiRaamatuLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const commands = lessonBySlug("kaskiv")?.n;
  const plural = lessonBySlug("mitmus")?.n;
  const future = LESSONS.find((lesson) => lesson.et === "Hakkan õppima")?.n;
  const pastNo = lessonBySlug("mineviku-eitus")?.n;
  const gradation = LESSONS.find((lesson) => lesson.et === "Jalg, jala")?.n;
  const pluralPartitive = LESSONS.find((lesson) => lesson.et === "Raamatuid, maju")?.n;
  const pronouns = lessonBySlug("asesonad")?.n;

  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  const names = { second: t`Mari`, main: t`Jaan` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The object, the thing a verb acts on, usually takes the genitive when the action takes in
          the whole of it, and the partitive when it takes in only part, or never finishes.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "läbi",
        "ära",
        "pilet",
        "kook",
        "võti",
        "supp",
        "ootama",
        "aitama",
        "armastama",
        "otsima",
        "leidma",
        "ma ootan sõpra.",
        "osta pilet!",
      ]}
      recap={[
        <Trans key="1">
          Part of something, or an action still going on: the partitive.{" "}
          <b lang="et">Ma ostsin leiba. Ma lugesin raamatut.</b>
        </Trans>,
        <Trans key="2">
          The whole thing, done or sure to get done: for a noun, usually the genitive, often with{" "}
          <b lang="et">läbi</b> or <b lang="et">ära</b>.{" "}
          <b lang="et">Ma lugesin raamatu läbi. Ma loen raamatu läbi.</b>
        </Trans>,
        <Trans key="3">
          After <b lang="et">ei</b>, always the partitive: <b lang="et">Ma ei ostnud piletit.</b> On
          their own, <b lang="et">ootama, aitama, armastama</b> and <b lang="et">otsima</b> take it
          too: <b lang="et">Ma ootan sõpra.</b>
        </Trans>,
        <Trans key="4">
          In a command, a whole noun usually takes the nominative, and a command with{" "}
          <b lang="et">ära</b>, don’t, takes the partitive:{" "}
          <b lang="et">Osta pilet! Ära osta piletit!</b>
        </Trans>,
        <Trans key="5">
          More than one whole thing, with no number before it, takes the plural with{" "}
          <b lang="et">-d</b>: <b lang="et">Ma ostsin piletid.</b> After a number, the partitive:{" "}
          <b lang="et">kaks piletit</b>.
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
                    <Word w="Ma ostsin leiba." /> I bought some bread. <Word w="Ma ostsin leiva." />{" "}
                    I bought a loaf, the whole of it. The verb is the same. Only the object changed:
                    the bread, the thing the verb acts on.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <b lang="et">Leiba</b> is the partitive from lesson {partitive}: part of
                    something, or an action that didn’t take in all of it. <b lang="et">Leiva</b> is
                    the genitive from lesson {genitive}: the whole thing, done. Tap the sentences in
                    both columns.
                  </Trans>
                </p>
              </Prose>
              <PairTable />
              <Prose>
                <p>
                  <Trans>
                    Two small words after a verb often say that it’s done: <Word w="läbi" />,
                    through to the end, and <Word w="ära" />, all of it. In a statement without{" "}
                    <b lang="et">ei</b>, a noun object before them usually takes the genitive.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  English says this with “some” and “a”, or with “was reading” and “read”. Estonian
                  says it with the object’s case, so the ending carries the meaning.
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  Pronouns are different. <b lang="et">Mina, sina, meie</b> and{" "}
                  <b lang="et">teie</b> can take the partitive even for the whole person:{" "}
                  <b lang="et">Ta viis mu koju</b> or <b lang="et">Ta viis mind koju</b>;{" "}
                  <b lang="et">Ta viis meid koju</b>. In a command, only the partitive:{" "}
                  <b lang="et">Vii mind koju!</b> <b lang="et">Ta</b> works like a noun:{" "}
                  <b lang="et">Vii ta koju!</b> Lesson {pronouns} has every form.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "done",
          title: t`Finished, or still going on`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The same choice tells a finished action from one still going on.{" "}
                    <Word w="Ma lugesin raamatut." /> means you were reading, maybe not to the end.{" "}
                    <Word w="Ma lugesin raamatu läbi." /> means you finished it.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The present also covers the future, as lesson {future} says, and the object
                    tells you which. With the partitive, it’s going on, with no end in view. With
                    the genitive, it will get done: <Word w="Ma loen raamatu läbi." />
                  </Trans>
                </p>
              </Prose>
              <NowTable />
              <Aside>
                <Trans>
                  Some objects change more than their ending. <Word w="Supp" /> loses a p in the
                  genitive, <b lang="et">supi</b>, and <Word w="kook" /> turns its last k into g,{" "}
                  <b lang="et">koogi</b>. Lesson {gradation} explains why.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence, then pick what it means. The verb’s tense narrows it to two;
                    the object’s ending decides.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-done"
                title={<Trans>Done, going on, or still to come?</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You heard which actions got done.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the sentences in both tables once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  heardRun(items, pinned, (item) => ({
                    ...item,
                    options: shuffle(item.options),
                  }))
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "always",
          title: t`After a no, and verbs with no end`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    After <b lang="et">ei</b>, the action doesn’t happen, so the object always takes
                    the partitive: <Word w="Ma ei ostnud piletit." /> It doesn’t matter whether a
                    whole ticket was meant. Lesson {pastNo} teaches <b lang="et">ei ostnud</b>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(OBJECT_NO)} />
              <Prose>
                <p>
                  <Trans>
                    Some verbs have no end point: you can wait, help, love or look for as long as
                    you like. On their own, <Word w="ootama" />, <Word w="aitama" />,{" "}
                    <Word w="armastama" /> and <Word w="otsima" /> take the partitive.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(OBJECT_VERBS)} />
              <Aside>
                <Trans>
                  A small word after the verb can give it an end, and then the object takes the
                  genitive: <b lang="et">Ma otsisin hosteli üles</b>, I found the hostel, and{" "}
                  <b lang="et">Me ootame Mari ära</b>, we’ll wait until Mari comes.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Finding is different. <Word w="Leidma" />, to find, ends the looking, so what
                    you found takes the genitive.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf([OBJECT_FOUND.looked, OBJECT_FOUND.found])} />
              <Prose>
                <p>
                  <Trans>
                    Each round gives a word as a dictionary lists it and a sentence with a gap. Type
                    the form the gap needs. Some rounds take the genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="object-form"
                title={<Trans>Type the object</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the sentences above for the ones you missed.</Trans>
                  ) : (
                    <Trans>Hear the sentences above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={pairRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "commands",
          title: t`In a command`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In a command about a whole thing, a noun object usually takes the nominative,
                    the form a dictionary lists: <Word w="Osta pilet!" /> Not{" "}
                    <b lang="et">pileti</b>. Lesson {commands} teaches the command itself.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A command with <b lang="et">ära</b>, don’t, is a no, so its object takes the
                    partitive: <Word w="Ära osta piletit!" />
                  </Trans>
                </p>
              </Prose>
              <CommandTable />
              <Aside>
                <Trans>
                  This <b lang="et">ära</b> comes before the verb and means don’t. The{" "}
                  <b lang="et">ära</b> after a verb means all of it: <Word w="Söö supp ära!" /> Eat
                  up the soup!
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  More than one whole thing, with no number before it, takes the plural with{" "}
                  <b lang="et">-d</b> from lesson {plural}: <Word w="Ma ostsin piletid." />{" "}
                  <Word w="Osta piletid!" /> After a number, the partitive singular:{" "}
                  <b lang="et">kaks piletit</b>. Some of many things takes the plural partitive,
                  which lesson {pluralPartitive} teaches.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a sentence about something you did. Write the command that
                    tells a friend to do it, or not to, as the cue says.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-a-friend"
                title={<Trans>Tell a friend</Trans>}
                items={content.rewrites}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six commands, with the right object.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Compare the columns of the table for the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap each column of the table once more, then try again.</Trans>
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
          id: "voice",
          title: t`A voice message from the shop`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your friend Liisa leaves you a voice message. Listen for what she bought, what
                    she didn’t, and what she asks you.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liisa-voice"
                title={<Trans>Listen: Liisa at the shop</Trans>}
                clip="p-voice"
                sentences={OBJECT_VOICE}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "meaning",
          title: t`From English to Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now the other way round. Each round gives a sentence in English to write in
                    Estonian. The English says whether it’s some or all, done or going on, and the
                    object’s form follows from that, or from the verb.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="only-meaning"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each object in the form its meaning needs.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the object in the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the sentences in the tables above once more, then try again.</Trans>
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
          id: "mistakes",
          title: t`Fix the object`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one object in the wrong case. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-object"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
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
          id: "cafe",
          title: t`At a café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You order at a café. Pick what you say back. A wrong reply says why, then you
                    hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="cafe-order"
                title={<Trans>Talk: at a café</Trans>}
                part={
                  <Trans>
                    You want one cake and no tea. You’ve lost your key, and you’ll eat the cake
                    right away.
                  </Trans>
                }
                them={t`Server`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "next-day",
          title: t`Mari and Jaan the next day`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari and Jaan talk about yesterday: a book, a key and a cake.</Trans>
                </p>
              </Prose>
              <Listening
                id="book-key-cake"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-book-key-cake"
                turns={OBJECT_CONVERSATION.turns}
                names={names}
                questions={content.exam}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
