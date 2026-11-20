/** A dev-only page that compares options for four new lesson types. Not for shipping. */
import { msg } from "@lingui/core/macro";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useState } from "react";
import { Island } from "../../islands/Island";
import { LearnLayout } from "../LearnLayout";
import { type Glossary, LessonContext } from "../lesson-context";
import { WordCards } from "../Word";
import { Listen2A, Listen2B } from "./Listen2";
import { DialogueA, DialogueC, GapsA, GapsB, ReadA, ReadB, ReadC } from "./Variants";

const GLOSSARY: Glossary = {
  õpetaja: { en: msg`teacher`, clip: false },
  palju: { en: msg`a lot, much`, clip: false },
  vend: { en: msg`brother`, clip: false },
  kuulab: { en: msg`listens`, note: msg`From kuulama, to listen.`, clip: false },
  muusikat: { en: msg`music`, note: msg`The partitive of muusika.`, clip: false },
};

interface Option {
  id: string;
  name: string;
  choices: string;
  view: () => ReactNode;
}

const TYPES: readonly { id: string; title: string; when: string; options: readonly Option[] }[] = [
  {
    id: "listen",
    title: "1. Listen, then answer",
    when: "One recording of the whole passage, all questions at once, answers lettered.",
    options: [
      {
        id: "A",
        name: "Check at the end",
        choices: "Listen as often as you like, answer every question, then one Check. The text appears after, with the sentences behind missed answers underlined.",
        view: () => <Listen2A />,
      },
      {
        id: "B",
        name: "Marked as you answer",
        choices: "Each answer marks at once, with a button to hear the moment that answered it. The text appears once all are answered.",
        view: () => <Listen2B />,
      },
    ],
  },
  {
    id: "gaps",
    title: "2. A passage with gaps",
    when: "Grammar in context: pick the form that fills each gap.",
    options: [
      {
        id: "A",
        name: "Tap a gap",
        choices: "Options for the open gap sit under the passage. Each gap marks at once. No sound until the end, when the whole passage can be heard.",
        view: () => <GapsA />,
      },
      {
        id: "B",
        name: "Drag and drop",
        choices: "Drag words from the bank into the gaps, two spare; drag them out or between gaps, or tap a word then a gap. Check all, then hear the passage.",
        view: () => <GapsB />,
      },
    ],
  },
  {
    id: "read",
    title: "3. Read, then answer",
    when: "A short text to read, and one recording of it. Word meanings open once you have answered, so they can't give answers away.",
    options: [
      {
        id: "A",
        name: "Text, then questions",
        choices: "The text sits on the page like prose. Under it, every question at once with lettered answers and one Check, the same as listening.",
        view: () => <ReadA />,
      },
      {
        id: "B",
        name: "Side by side",
        choices: "On a wide screen the text stays in view beside the questions; on a phone it stacks. One Check.",
        view: () => <ReadB />,
      },
      {
        id: "C",
        name: "Find it in the text",
        choices: "The answer is a sentence: tap where the text says it.",
        view: () => <ReadC />,
      },
    ],
  },
  {
    id: "dialogue",
    title: "4. Dialogue",
    when: "Your pick: the chat. Each dialogue sets how much it shows; no translations. Both voices now play at the same loudness.",
    options: [
      {
        id: "A",
        name: "Words shown",
        choices: "Mari's lines arrive written and spoken. For early lessons.",
        view: () => <DialogueA />,
      },
      {
        id: "B",
        name: "Sound only",
        choices: "Mari's lines arrive as sound; a learner can still ask to see one. For later lessons, as a harder level.",
        view: () => <DialogueC />,
      },
    ],
  },
];

function Switcher({ value, options, onPick }: { value: string; options: readonly Option[]; onPick: (id: string) => void }) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-full bg-plate p-1 ring-1 ring-edge">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onPick(o.id)}
          className={clsx(
            "cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.id ? "bg-ink text-plate" : "text-ink-secondary hoverable:hover:bg-plate-hover",
          )}
        >
          <b className="me-1 font-semibold">{o.id}</b>
          {o.name}
        </button>
      ))}
    </div>
  );
}

function TypeSection({ type }: { type: (typeof TYPES)[number] }) {
  const [picked, setPicked] = useState(() => {
    if (typeof location === "undefined") return "A";
    return new URLSearchParams(location.search).get(type.id) ?? "A";
  });
  const option = type.options.find((o) => o.id === picked) ?? (type.options[0] as Option);
  return (
    <section id={type.id} className="grid scroll-mt-24 gap-4 border-t border-edge pt-10 pb-12">
      <div className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">{type.title}</h2>
        <p className="text-md text-ink-secondary">{type.when}</p>
      </div>
      <Switcher
        value={option.id}
        options={type.options}
        onPick={(id) => {
          setPicked(id);
          const url = new URL(location.href);
          url.searchParams.set(type.id, id);
          history.replaceState(null, "", url);
        }}
      />
      <p className="max-w-[62ch] text-md text-ink-secondary">
        <b className="font-medium text-ink">
          {option.id} · {option.name}.
        </b>{" "}
        {option.choices}
      </p>
      <div key={option.id} className="pt-2">
        {option.view()}
      </div>
    </section>
  );
}

function ThemeSwitch() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
      }}
      className="cursor-pointer rounded-full bg-plate px-3 py-1.5 text-sm font-medium ring-1 ring-edge hoverable:hover:bg-plate-hover"
    >
      {dark ? "Light" : "Night"}
    </button>
  );
}

export default function Lab() {
  return (
    <Island locale="en">
      <LessonContext.Provider value={{ slug: "proto", glossary: GLOSSARY, finishSection: () => {} }}>
        <WordCards>
          <LearnLayout languages={{ paths: { en: "/estonian/learn/lab", uk: "/estonian/learn/lab", ru: "/estonian/learn/lab" } }} hue={222}>
            <div className="mx-auto max-w-[720px] px-5">
              <header className="grid gap-3 pt-8 pb-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-md font-medium text-(--form)">Prototype · lesson types</span>
                  <ThemeSwitch />
                </div>
                <h1 className="text-5xl leading-none font-semibold tracking-[-0.03em]">Four new kinds of practice</h1>
                <p className="max-w-[52ch] text-lg text-ink-secondary">
                  Each has two or three options. Switch between them, try them, and tell me a letter for each. The Estonian comes from lessons 1–5: pronouns, olema, the present tense, ei and kas.
                </p>
                <nav className="flex flex-wrap gap-x-4 gap-y-1 text-md font-medium">
                  {TYPES.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="text-(--form) underline-offset-2 hover:underline">
                      {t.title.slice(3)}
                    </a>
                  ))}
                </nav>
              </header>
              {TYPES.map((t) => (
                <TypeSection key={t.id} type={t} />
              ))}
            </div>
          </LearnLayout>
        </WordCards>
      </LessonContext.Provider>
    </Island>
  );
}
