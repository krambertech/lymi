import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  REL_ANSWERS,
  REL_CASES,
  REL_COMMAS,
  REL_CONVERSATION,
  REL_FIX_ANSWERS,
  REL_FIXES,
  REL_FORMS,
  REL_HEARD,
  REL_LETTER,
  REL_ORDER,
  REL_PLACES,
  REL_ROLES,
  REL_TABLE,
  REL_TRANSLATE,
  REL_WHERE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "raamat-mille-ostsin";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const GLOSSARY: Glossary = {
  kes: { en: msg`who`, note: msg`Kes elab siin?` },
  mis: { en: msg`what, which, that`, note: msg`Mis see on?` },
  kelle: { en: msg`whose, whom`, note: msg`Kelle auto see on?` },
  mille: { en: msg`whose, of which; the whole thing done`, note: msg`Raamat, mille ma ostsin.` },
  keda: { en: msg`whom, who (part)`, note: msg`Keda sa ootad?` },
  mida: { en: msg`what, which (part)`, note: msg`Mida sa ootad?` },
  kellega: { en: msg`with whom`, note: msg`Kellega sa räägid?` },
  millega: { en: msg`with what, with which`, note: msg`Millega sa kirjutad?` },
  kellele: { en: msg`to whom`, note: msg`Kellele sa helistad?` },
  millele: { en: msg`to what, to which`, note: msg`Millele sa vastad?` },
  kellest: { en: msg`about whom, out of whom`, note: msg`Kellest sa räägid?` },
  millest: { en: msg`about what, out of which`, note: msg`Millest sa räägid?` },
  kellel: { en: msg`who has, on whom`, note: msg`Kellel on koer?` },
  millel: { en: msg`which has, on which`, note: msg`Millel on suur aed?` },
  milles: { en: msg`in which, in what`, note: msg`Milles sa elad?` },
  kus: { en: msg`where`, note: msg`Kus sa elad?` },
  kuhu: { en: msg`to where`, note: msg`Kuhu sa sõidad?` },
  kust: { en: msg`from where`, note: msg`Kust sa tuled?` },
};

const lit = (said: string, from: string) => {
  const at = said.indexOf(from);
  return `${said.slice(0, at)}|${said.slice(at)}`;
};

const litComma = (said: string, comma: number) => {
  let at = -1;
  for (let i = 0; i <= comma; i += 1) at = said.indexOf(",", at + 1);
  return `${said.slice(0, at)}|${said.slice(at)}`;
};

const ROW_NAMES: Record<(typeof REL_TABLE)[number]["id"], MessageDescriptor> = {
  subject: msg`Book, man`,
  outside: msg`Car, woman`,
  starts: msg`Film, child`,
  big: msg`House, teacher`,
};

function KesMisTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = REL_TABLE.map((row) => ({
    id: row.id,
    label: i18n._(ROW_NAMES[row.id]),
    cells: [
      { form: lit(row.mis, "mis"), src: src(row.mis) },
      { form: lit(row.kes, "kes"), src: src(row.kes) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Relative clauses about things and people`}
        columns={[t`Things`, t`People`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              <b lang="et">mis</b> follows a thing or an idea, and <b lang="et">kes</b> follows a
              person.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const COMMA_NAMES: Record<(typeof REL_COMMAS)[number]["id"], MessageDescriptor> = {
  man: msg`The man`,
  car: msg`The car`,
  book: msg`The book`,
};

function CommaTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = REL_COMMAS.map((row) => ({
    id: row.id,
    label: i18n._(COMMA_NAMES[row.id]),
    cells: [
      { form: litComma(row.end, 0), src: src(row.end) },
      { form: litComma(row.middle, 0), src: src(row.middle) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Where the commas go`}
        columns={[t`Clause at the end`, t`Clause in the middle`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              A comma goes before <b lang="et">mis</b> or <b lang="et">kes</b>. In the middle of a
              sentence, a second comma closes the clause.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type CaseId = (typeof REL_CASES)[number]["id"];

const CASE_NAMES: Record<CaseId, MessageDescriptor> = {
  subject: msg`Nominative: the subject`,
  owner: msg`Genitive: whose`,
  part: msg`Partitive: part of it`,
  with: msg`With: -ga`,
  to: msg`To: -le`,
  about: msg`About, out of: -st`,
  has: msg`Has, on: -l`,
  in: msg`In: -s`,
};

const CASE_TIPS: Record<CaseId, MessageDescriptor> = {
  subject: msg`The man is the subject of the clause, so the word stays in the nominative.`,
  owner: msg`The car belongs to the woman, so the word is in the genitive, like any owner.`,
  part: msg`You wait for him, and ootama takes the partitive, so the word is in the partitive.`,
  with: msg`You talked with her, so the word takes -ga.`,
  to: msg`You phoned him, so the word takes -le.`,
  about: msg`You talked about her, so the word takes -st.`,
  has: msg`The child has a dog, so the word takes -l.`,
  in: msg`You live in the house, so the word takes -s. It is the same idea as kus.`,
};

function CaseTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = REL_CASES.map((row) => ({
    id: row.id,
    label: i18n._(CASE_NAMES[row.id]),
    tip: i18n._(CASE_TIPS[row.id]),
    cells: [
      row.kes ? { form: lit(row.kes, row.kes.split(", ")[1] as string), src: src(row.kes) } : null,
      { form: lit(row.mis, row.mis.split(", ")[1] as string), src: src(row.mis) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Relative words in every case`}
        columns={[t`People`, t`Things`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              The word after the comma takes the case it would have inside its own clause.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const WHERE_NAMES: Record<(typeof REL_WHERE)[number]["id"], MessageDescriptor> = {
  at: msg`Where`,
  to: msg`To where`,
  from: msg`From where`,
  in: msg`In which`,
};

const WHERE_TIPS: Record<(typeof REL_WHERE)[number]["id"], MessageDescriptor> = {
  at: msg`The usual word for a place where something is or happens.`,
  to: msg`For a place you go to.`,
  from: msg`For a place you come from.`,
  in: msg`The same idea with mis in the -s case. It usually sounds more formal than kus.`,
};

function WhereTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = REL_WHERE.map((row) => ({
    id: row.id,
    label: i18n._(WHERE_NAMES[row.id]),
    et: row.word,
    tip: i18n._(WHERE_TIPS[row.id]),
    cells: [{ form: lit(row.said, row.word), src: src(row.said) }],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Relative clauses about a place`}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: <Trans>Each clause says more about a city or a house.</Trans>,
        }}
      />
    </Panel>
  );
}

const HEARD_MEANS: Record<(typeof REL_HEARD)[number]["id"], MessageDescriptor> = {
  book: msg`The book that is on the table is new.`,
  man: msg`The man who lives here is a doctor.`,
  car: msg`The car that stands outside is red.`,
  woman: msg`The woman who works in the shop is my mother.`,
  bag: msg`The bag that is on the table is heavy.`,
  neighbour: msg`The neighbour who plays the piano is friendly.`,
  film: msg`The film that starts at eight is long.`,
  child: msg`The child who plays outside is my son.`,
};

const PLACE_MEANS: Record<(typeof REL_PLACES)[number]["id"], MessageDescriptor> = {
  city: msg`The city where I live is small.`,
  bag: msg`The bag that is on the table is heavy.`,
  cafe: msg`The café where we drink coffee is cheap.`,
  "big-house": msg`The house that is big is old.`,
  park: msg`The park where the children play is big.`,
  car: msg`The car that stands outside is red.`,
  house: msg`The house where I live is old.`,
  film: msg`The film that starts at eight is long.`,
};

const wordOptions = (first: string, second: string) =>
  [first, second].map((id) => ({
    id,
    label: (
      <span lang="et" className="text-lg font-medium tracking-normal">
        {id}
      </span>
    ),
  }));

const ROLE_LABELS: Record<(typeof REL_ROLES)[number]["role"], MessageDescriptor> = {
  owner: msg`Whose it is`,
  object: msg`What is done to`,
  with: msg`Together with`,
  to: msg`Given or sent to`,
  about: msg`What it is about`,
};

const ROLE_MEANS: Record<(typeof REL_ROLES)[number]["id"], MessageDescriptor> = {
  "owner-kes": msg`I know the woman whose car is red.`,
  "part-kes": msg`I know the man you are waiting for.`,
  "with-kes": msg`I know the woman you talked with.`,
  "to-kes": msg`I know the man you phoned.`,
  "about-mis": msg`I watched the film you talked about.`,
  "with-mis": msg`I saw the car you were driving.`,
  "owner-mis": msg`I saw the house whose door is blue.`,
  "part-mis": msg`I am watching the film you are waiting for.`,
  "whole-mis": msg`The book I bought is interesting.`,
};

const FORM_MEANS: Record<(typeof REL_FORMS)[number]["id"], MessageDescriptor> = {
  "part-kes": msg`the man you are waiting for`,
  "part-mis": msg`the film you are waiting for`,
  "with-kes": msg`the woman you talked with`,
  "with-mis": msg`the car you were driving`,
  "to-kes": msg`the man you phoned`,
  "about-mis": msg`the film you talked about`,
  "has-kes": msg`the child who has a dog`,
  "owner-mis": msg`the house whose door is blue`,
};

const gapOf = (said: string, form: string) => said.replace(form, "___");

const FORM_REASONS: Record<(typeof REL_FORMS)[number]["id"], ReactNode> = {
  "part-kes": (
    <Trans>
      You wait for him, and <b lang="et">ootama</b> takes the partitive: <b lang="et">keda</b>.
    </Trans>
  ),
  "part-mis": (
    <Trans>
      You wait for the film, and <b lang="et">ootama</b> takes the partitive: <b lang="et">mida</b>.
    </Trans>
  ),
  "with-kes": (
    <Trans>
      You talked with her, so the word takes <b lang="et">-ga</b>: <b lang="et">kellega</b>.
    </Trans>
  ),
  "with-mis": (
    <Trans>
      You drove in it, so the word takes <b lang="et">-ga</b>: <b lang="et">millega</b>.
    </Trans>
  ),
  "to-kes": (
    <Trans>
      You phoned him, so the word takes <b lang="et">-le</b>: <b lang="et">kellele</b>.
    </Trans>
  ),
  "about-mis": (
    <Trans>
      You talked about it, so the word takes <b lang="et">-st</b>: <b lang="et">millest</b>.
    </Trans>
  ),
  "has-kes": (
    <Trans>
      The child has a dog, so the word takes <b lang="et">-l</b>: <b lang="et">kellel</b>.
    </Trans>
  ),
  "owner-mis": (
    <Trans>
      The door belongs to the house, so the word is in the genitive: <b lang="et">mille</b>.
    </Trans>
  ),
};

const ORDER_MEANS: Record<(typeof REL_ORDER)[number]["id"], MessageDescriptor> = {
  man: msg`The man who lives here is a doctor.`,
  know: msg`I know the man who lives here.`,
  book: msg`The book that is on the table is new.`,
  car: msg`I saw the car that stands outside.`,
  woman: msg`The woman who works in the shop is my mother.`,
  read: msg`I read the book that is on the table.`,
};

const TRANSLATE_PROMPTS: Record<(typeof REL_TRANSLATE)[number], MessageDescriptor> = {
  "Raamat, mille ma ostsin, on huvitav.": msg`The book I bought is interesting.`,
  "Mees, keda ma tunnen, elab Tartus.": msg`The man I know lives in Tartu.`,
  "Naine, kellega ma rääkisin, on õpetaja.": msg`The woman I talked with is a teacher.`,
  "Film, mida ma ootan, on pikk.": msg`The film I am waiting for is long.`,
  "Maja, kus ma elan, on vana.": msg`The house where I live is old.`,
  "Laps, kes mängib õues, on mu poeg.": msg`The child who plays outside is my son.`,
  "Sõber, kellele ma helistasin, on Tallinnas.": msg`The friend I phoned is in Tallinn.`,
};

const TRANSLATE_WHY: Partial<Record<(typeof REL_TRANSLATE)[number], ReactNode>> = {
  "Raamat, mille ma ostsin, on huvitav.": (
    <Trans>
      I bought the whole book, so the object is <b lang="et">mille</b>. <b lang="et">Mida</b> also
      works when the buying is not finished or is not the point.
    </Trans>
  ),
  "Mees, keda ma tunnen, elab Tartus.": (
    <Trans>
      <b lang="et">Tundma</b> takes the partitive, so the man is <b lang="et">keda</b>.
    </Trans>
  ),
  "Maja, kus ma elan, on vana.": (
    <Trans>
      For a place, <b lang="et">kus</b> usually works. <b lang="et">Milles</b> also works.
    </Trans>
  ),
  "Sõber, kellele ma helistasin, on Tallinnas.": (
    <Trans>
      <b lang="et">Helistama</b> takes <b lang="et">-le</b>, so the friend is{" "}
      <b lang="et">kellele</b>.
    </Trans>
  ),
};

const FIX_PROMPTS: Record<(typeof REL_FIXES)[number]["right"], MessageDescriptor> = {
  "Mees, kes elab siin, on arst.": msg`The man who lives here is a doctor.`,
  "Raamat, mis on laual, on uus.": msg`The book that is on the table is new.`,
  "Ma tunnen meest, keda sa ootad.": msg`I know the man you are waiting for.`,
  "Ma tunnen naist, kelle auto on punane.": msg`I know the woman whose car is red.`,
  "Ma tunnen meest, kellele sa helistasid.": msg`I know the man you phoned.`,
  "Linn, kus ma elan, on väike.": msg`The city where I live is small.`,
};

const FIX_WHY: Record<(typeof REL_FIXES)[number]["right"], ReactNode> = {
  "Mees, kes elab siin, on arst.": (
    <Trans>
      A man is a person, so the word is <b lang="et">kes</b>, not <b lang="et">mis</b>.
    </Trans>
  ),
  "Raamat, mis on laual, on uus.": (
    <Trans>
      A book is a thing, so the word is <b lang="et">mis</b>, not <b lang="et">kes</b>.
    </Trans>
  ),
  "Ma tunnen meest, keda sa ootad.": (
    <Trans>
      <b lang="et">Ootama</b> takes the partitive, so the word is <b lang="et">keda</b>, not{" "}
      <b lang="et">kelle</b>.
    </Trans>
  ),
  "Ma tunnen naist, kelle auto on punane.": (
    <Trans>
      Whose car is <b lang="et">kelle auto</b>, the genitive. <b lang="et">Keda</b> is the
      partitive.
    </Trans>
  ),
  "Ma tunnen meest, kellele sa helistasid.": (
    <Trans>
      <b lang="et">Helistama</b> takes <b lang="et">-le</b>: <b lang="et">kellele</b>, not{" "}
      <b lang="et">kellega</b>.
    </Trans>
  ),
  "Linn, kus ma elan, on väike.": (
    <Trans>
      A place where something happens is <b lang="et">kus</b>. <b lang="et">Milles</b> also works.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const rule = {
      mis: (
        <Trans>
          <b lang="et">Mis</b> usually follows a thing.
        </Trans>
      ),
      kes: (
        <Trans>
          <b lang="et">Kes</b> follows a person.
        </Trans>
      ),
    };
    const placeRule = {
      kus: (
        <Trans>
          A place where something is or happens is <b lang="et">kus</b>.
        </Trans>
      ),
      mis: (
        <Trans>
          A thing that is described is <b lang="et">mis</b>.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = REL_HEARD.map(
      (each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options: wordOptions("mis", "kes"),
        pair: [each.id, each.id] as const,
        explain: (
          <>
            <Trans>
              <b lang="et">{each.said}</b> {i18n._(HEARD_MEANS[each.id])}
            </Trans>{" "}
            {rule[each.means]}
          </>
        ),
      }),
    );

    const orderWhy = (
      <Trans>
        The clause usually comes right after the noun it describes. A comma goes before it and, in
        the middle of a sentence, a second one after it. Inside the clause, the verb can come before
        or after the other words: <b lang="et">kes elab siin</b> or <b lang="et">kes siin elab</b>.
      </Trans>
    );
    const built: (OrderItem & { id: string })[] = REL_ORDER.map(({ id, answers }) => ({
      id,
      answers,
      src: src(answers[0]),
      meaning: i18n._(ORDER_MEANS[id]),
      explain: orderWhy,
    }));

    const forms: (FormItem & { pair: readonly [string, string] })[] = REL_FORMS.map((each) => ({
      base: each.base,
      gloss: i18n._(FORM_MEANS[each.id]),
      cue: gapOf(each.said, each.form),
      cueLang: "et",
      answers: [each.form],
      src: src(each.said),
      said: <span lang="et">{each.said}</span>,
      explain: FORM_REASONS[each.id],
      pair: [each.form, each.form] as const,
    }));

    const roles: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = REL_ROLES.map(
      (each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.role,
        options: [each.role, each.slip].map((id) => ({
          id,
          label: (
            <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
              {i18n._(ROLE_LABELS[id as keyof typeof ROLE_LABELS])}
            </span>
          ),
        })),
        pair: [each.id, each.id] as const,
        explain: (
          <Trans>
            <b lang="et">{each.said}</b> {i18n._(ROLE_MEANS[each.id])}
          </Trans>
        ),
      }),
    );

    const places: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      REL_PLACES.map((each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options: wordOptions("kus", "mis"),
        pair: [each.id, each.id] as const,
        explain: (
          <>
            <Trans>
              <b lang="et">{each.said}</b> {i18n._(PLACE_MEANS[each.id])}
            </Trans>{" "}
            {placeRule[each.means]}
          </>
        ),
      }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = REL_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: REL_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: TRANSLATE_WHY[said],
      }),
    );

    const fixes: FixItem[] = REL_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: REL_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      prompt: i18n._(FIX_PROMPTS[item.right]),
      explain: FIX_WHY[item.right],
    }));

    const letter: PassageQuestion[] = [
      {
        id: "rent",
        ask: t`How much does the flat cost a month?`,
        options: [
          { id: "less", label: t`Two hundred euros` },
          { id: "three", label: t`Three hundred euros` },
          { id: "more", label: t`Four hundred and fifty euros` },
        ],
        answer: "three",
        line: 2,
      },
      {
        id: "table",
        kind: "truefalse",
        ask: t`Helen bought the kitchen table from her grandmother.`,
        answer: true,
        line: 3,
      },
      {
        id: "cake",
        ask: t`What did the neighbour bring her?`,
        options: [
          { id: "coffee", label: t`A cup of coffee` },
          { id: "chair", label: t`A chair for the kitchen` },
          { id: "cake", label: t`A cake he baked himself` },
        ],
        answer: "cake",
        line: 9,
      },
      {
        id: "work",
        kind: "short",
        ask: t`Where does the neighbour’s daughter work? Write it as Helen does.`,
        answers: ["kohvikus"],
        line: 8,
      },
      {
        id: "coffee",
        kind: "truefalse",
        ask: t`Helen had drunk this coffee many times before.`,
        answer: false,
        line: 8,
      },
      {
        id: "dislike",
        ask: t`What does Helen not like about the place?`,
        options: [
          { id: "street", label: t`The noisy street right under the window` },
          { id: "car", label: t`An old car in the yard` },
          { id: "park", label: t`The park being far away from home` },
        ],
        answer: "car",
        line: 16,
      },
      {
        id: "abroad",
        kind: "truefalse",
        ask: t`The owner of the car lives abroad.`,
        answer: true,
        line: 17,
      },
      {
        id: "bring",
        kind: "short",
        ask: t`What does Helen ask her friend to bring? Write it as Helen does.`,
        answers: ["raamat"],
        line: 20,
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "cafe",
        ask: t`What was the café like?`,
        options: [
          { id: "big", label: t`Big, and the evening was dull.` },
          { id: "small", label: t`Small, but fun.` },
          { id: "cold", label: t`Cold, and nobody stayed late.` },
        ],
        answer: "small",
        line: 4,
      },
      {
        id: "man",
        ask: t`Who is the man by the window?`,
        options: [
          { id: "colleague", label: t`Tiina’s new colleague` },
          { id: "brother", label: t`Tiina’s brother` },
          { id: "neighbour", label: t`Madis’s friend from school` },
        ],
        answer: "colleague",
        line: 12,
      },
      {
        id: "sister",
        kind: "truefalse",
        ask: t`The woman with the guitar is Tiina’s sister.`,
        answer: true,
        line: 15,
      },
      {
        id: "guitar",
        ask: t`Whose guitar is it?`,
        options: [
          { id: "kadri", label: t`Kadri’s own` },
          { id: "madis", label: t`Madis’s` },
          { id: "grandfather", label: t`Their grandfather’s` },
        ],
        answer: "grandfather",
        line: 16,
      },
      {
        id: "ill",
        ask: t`Why wasn’t Madis at the party?`,
        options: [
          { id: "work", label: t`He had to work late.` },
          { id: "ill", label: t`He was ill.` },
          { id: "unknown", label: t`Nobody had told him about it.` },
        ],
        answer: "ill",
        line: 21,
      },
      {
        id: "song",
        kind: "truefalse",
        ask: t`Nobody at the party knew the words of the song.`,
        answer: false,
        line: 19,
      },
      {
        id: "girl",
        kind: "short",
        ask: t`What is the name of the girl Tiina talks to? Write it as Tiina says it.`,
        answers: ["Maria"],
        line: 32,
      },
      {
        id: "years",
        kind: "truefalse",
        ask: t`Tiina had seen Maria often over the last ten years.`,
        answer: false,
        line: 33,
      },
      {
        id: "shop",
        ask: t`Where did Tiina find the book?`,
        options: [
          { id: "library", label: t`In a library` },
          { id: "bookshop", label: t`In an old bookshop` },
          { id: "market", label: t`At a big market in town` },
        ],
        answer: "bookshop",
        line: 39,
      },
      {
        id: "birthday",
        kind: "short",
        ask: t`When was Marten’s birthday? Write it as Tiina says it.`,
        answers: ["sel nädalal"],
        line: 42,
      },
      {
        id: "candles",
        ask: t`How many candles are on the cake?`,
        options: [
          { id: "three", label: t`Three` },
          { id: "five", label: t`Five` },
          { id: "seven", label: t`Seven` },
        ],
        answer: "five",
        line: 43,
      },
      {
        id: "friend",
        kind: "truefalse",
        ask: t`Madis wants to show the photos to a friend who couldn’t come.`,
        answer: true,
        line: 46,
      },
      {
        id: "next",
        kind: "truefalse",
        ask: t`The next party is in June.`,
        answer: false,
        line: 49,
      },
    ];

    return { heard, built, forms, roles, places, translations, fixes, letter, exam };
  }, [t, i18n]);
}

export function RaamatMilleOstsinLesson() {
  const { t } = useLingui();
  const content = useContent();
  const questions = lessonBySlug("kusimused")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const pronouns = lessonBySlug("asesonad")?.n;
  const names = { fourth: t`Madis`, third: t`Tiina` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Raamat, mille ma ostsin</b> is the book I bought: a clause that says more
          about a noun, with <b lang="et">mis</b> for things and <b lang="et">kes</b> for people.
        </Trans>
      }
      facts={[
        <Trans key="m">28 minutes</Trans>,
        <Trans key="q">9 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kes",
        "mis",
        "kelle",
        "mille",
        "keda",
        "mida",
        "kellega",
        "millega",
        "kellele",
        "millele",
        "kellest",
        "millest",
        "kellel",
        "millel",
        "milles",
        "kus",
        "kuhu",
        "kust",
      ]}
      recap={[
        <Trans key="1">
          A relative clause says more about a noun. <b lang="et">Mis</b> usually follows a thing or
          an idea and <b lang="et">kes</b> follows a person: <b lang="et">raamat, mis on laual</b>,{" "}
          <b lang="et">mees, kes elab siin</b>.
        </Trans>,
        <Trans key="2">
          A comma goes before the clause. In the middle of a sentence a second comma closes it:{" "}
          <b lang="et">Mees, kes elab siin, on arst.</b>
        </Trans>,
        <Trans key="3">
          The word takes the case it would have inside its own clause: <b lang="et">kelle</b>,{" "}
          <b lang="et">keda</b>, <b lang="et">kellega</b>, <b lang="et">kellele</b>,{" "}
          <b lang="et">kellest</b>, <b lang="et">kellel</b> and <b lang="et">mille</b>,{" "}
          <b lang="et">mida</b>, <b lang="et">millega</b>, <b lang="et">millele</b>,{" "}
          <b lang="et">millest</b>, <b lang="et">millel</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Kelle</b> and <b lang="et">mille</b> are the owner and, usually, the whole
          thing done. <b lang="et">Keda</b> and <b lang="et">mida</b> are the part, as after{" "}
          <b lang="et">ootama</b> and after <b lang="et">ei</b>.
        </Trans>,
        <Trans key="5">
          For a place, <b lang="et">kus</b> usually works: <b lang="et">linn, kus ma elan</b>.{" "}
          <b lang="et">Kuhu</b> is to a place and <b lang="et">kust</b> is from a place.
        </Trans>,
      ]}
      sections={[
        {
          id: "mis-kes",
          title: t`Things and people`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A relative clause says more about a noun:{" "}
                    <b lang="et">Raamat, mis on laual, on uus.</b> The book that is on the table is
                    new. The clause starts with <Word w="mis" /> or <Word w="kes" /> and works like
                    a small sentence inside the big one.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mis" /> usually follows a thing or an idea, and <Word w="kes" />{" "}
                    follows a person: <b lang="et">Mees, kes elab siin, on arst.</b> The man who
                    lives here is a doctor. They are the question words from lesson {questions}.
                  </Trans>
                </p>
              </Prose>
              <KesMisTable />
              <Prose>
                <p>
                  <Trans>Hear each sentence and pick the word that starts its clause.</Trans>
                </p>
              </Prose>
              <Quiz
                id="mis-or-kes"
                title={
                  <Trans>
                    Pick <b lang="et">mis</b> or <b lang="et">kes</b>
                  </Trans>
                }
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each matched to its noun.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the sentences above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  eachPairFirst(items, pinned).map((item) =>
                    item === pinned ? item : { ...item, options: shuffle(item.options) },
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "commas",
          title: t`Where the clause goes and its commas`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A relative clause is set off by commas. One goes before <b lang="et">mis</b> or{" "}
                    <b lang="et">kes</b>: <b lang="et">Ma tunnen meest, kes elab siin.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The clause usually stands right after the noun it describes. When that noun
                    starts the sentence, the clause ends in the middle, and a second comma closes
                    it: <b lang="et">Mees, kes elab siin, on arst.</b>
                  </Trans>
                </p>
              </Prose>
              <CommaTable />
              <Prose>
                <p>
                  <Trans>Build each sentence from what it means.</Trans>
                </p>
              </Prose>
              <Quiz
                id="clause-order"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six built.</Trans>
                  ) : (
                    <Trans>Read the note under each one you missed, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "forms",
          title: t`The word takes its own case`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The word after the comma does not copy the noun’s case. It takes the case it
                    would have if its clause stood alone. Take <b lang="et">Sa ootad meest.</b> You
                    wait for the man, and <b lang="et">ootama</b> takes the partitive. The word that
                    stands for the man in a relative clause is <Word w="keda" />:{" "}
                    <b lang="et">Ma tunnen meest, keda sa ootad.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So <Word w="kes" /> and <Word w="mis" /> have cases like a noun, and the endings
                    are the ones you know from lesson {pronouns}. Tap a sentence and read what the
                    lit word does in its clause.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
              <Aside>
                <Trans>
                  <Word w="Mille" /> is the owner, and it is usually the whole thing done too:{" "}
                  <b lang="et">Raamat, mille ma ostsin, on huvitav.</b> I bought the whole book.{" "}
                  <Word w="Mida" /> is the part, as after <b lang="et">ei</b> and after verbs such
                  as <b lang="et">ootama</b>, in lesson {object}:{" "}
                  <b lang="et">Film, mida ma ootan.</b>
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Type the form of <b lang="et">kes</b> or <b lang="et">mis</b> that fits the gap.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="relative-forms"
                title={<Trans>Make the form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ones you missed against the table.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "which",
          title: t`Which form is it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Two things cause most mix-ups. <Word w="Kelle" /> and <Word w="mille" /> mean
                    whose, and they are usually the whole thing done, while <Word w="keda" /> and{" "}
                    <Word w="mida" /> are the part. And the endings <b lang="et">-ga</b>,{" "}
                    <b lang="et">-le</b> and <b lang="et">-st</b> look alike.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Ask what the word does in its own clause: whose it is, what is done to it, who
                    is with it, who is given or sent something, or what it is about. Hear each
                    sentence and pick the job.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>What does the word do?</Trans>}
                items={content.roles}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine, with the ending heard each time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the table above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  eachPairFirst(items, pinned).map((item) =>
                    item === pinned ? item : { ...item, options: shuffle(item.options) },
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "places",
          title: t`Places`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For a place, <Word w="kus" /> usually works:{" "}
                    <b lang="et">Linn, kus ma elan, on väike.</b> The city where I live is small.
                    The same idea with <b lang="et">mis</b> is <Word w="milles" />, which usually
                    sounds more formal.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Kuhu" /> is to a place and <Word w="kust" /> is from a place. Tap a
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <WhereTable />
              <Prose>
                <p>
                  <Trans>Hear each sentence and pick the word that starts its clause.</Trans>
                </p>
              </Prose>
              <Quiz
                id="kus-or-mis"
                title={
                  <Trans>
                    Pick <b lang="et">kus</b> or <b lang="et">mis</b>
                  </Trans>
                }
                items={content.places}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each matched to its noun.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the sentences above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  eachPairFirst(items, pinned).map((item) =>
                    item === pinned ? item : { ...item, options: shuffle(item.options) },
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Choose <b lang="et">mis</b>, <b lang="et">kes</b> or <b lang="et">kus</b>, put
                    it in the case its clause needs, then write the whole sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-relative"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the right word.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the relative word in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong relative word: the wrong word for the noun or the
                    wrong case. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-relative"
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
          id: "letter",
          title: t`A letter about a new flat`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Helen writes to a friend about her new flat and her neighbours. Read her letter
                    and answer the questions, as in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="helen-flat"
                title={<Trans>What does Helen write?</Trans>}
                by={t`Helen writes`}
                sentences={REL_LETTER}
                questions={content.letter}
              />
            </>
          ),
        },
        {
          id: "photos",
          title: t`Two friends look at photos`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Tiina has brought photos of a party, and Madis asks who is who. Listen to them
                    twice and answer the questions.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="tiina-photos"
                title={<Trans>Listen: Tiina and Madis</Trans>}
                clip="c-tiina"
                turns={REL_CONVERSATION.turns}
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
