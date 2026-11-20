/** A dev-only page that compares options for four new lesson types. Not for shipping. */
import { msg } from "@lingui/core/macro";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useState } from "react";
import { Island } from "../../islands/Island";
import { LearnLayout } from "../LearnLayout";
import { type Glossary, LessonContext } from "../lesson-context";
import { WordCards } from "../Word";
import { DialogueA, DialogueB, DialogueC, GapsA, GapsB, GapsC, ListenA, ListenB, ListenC, ReadA, ReadB, ReadC } from "./Variants";

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
    when: "A short passage in one voice, questions in your language.",
    options: [
      {
        id: "A",
        name: "Player, then reveal",
        choices: "Text hidden until the end. One question at a time. The score shows the text, with the lines you missed marked.",
        view: () => <ListenA />,
      },
      {
        id: "B",
        name: "Text on a switch",
        choices: "Every sentence is its own row to replay. Text toggled by Show text. All questions at once, one Check.",
        view: () => <ListenB />,
      },
      {
        id: "C",
        name: "Questions first",
        choices: "Questions visible before you listen. Each marks as you answer and shows the sentence that held it.",
        view: () => <ListenC />,
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
        choices: "Options for the open gap sit under the passage. Each gap marks at once and plays its sentence.",
        view: () => <GapsA />,
      },
      {
        id: "B",
        name: "Word bank",
        choices: "One bank of words, two spare. Place them anywhere, take them back, then Check all.",
        view: () => <GapsB />,
      },
      {
        id: "C",
        name: "Line by line, by ear",
        choices: "Hear a sentence, fill its gap; finished lines build up above, each to hear again.",
        view: () => <GapsC />,
      },
    ],
  },
  {
    id: "read",
    title: "3. Read, then answer",
    when: "A short text to read; words have their cards; it can be heard too.",
    options: [
      {
        id: "A",
        name: "Text, then quiz",
        choices: "The text sits on the page like prose. The quiz under it asks one question at a time.",
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
    when: "You play one side. Mari speaks in her own voice (Liis); your lines in Priit's.",
    options: [
      {
        id: "A",
        name: "Chat",
        choices: "Mari's lines arrive written and spoken. Your replies are picked under the chat; a wrong pick explains why, then Say it.",
        view: () => <DialogueA />,
      },
      {
        id: "B",
        name: "Script",
        choices: "Lines as a script, speaker on the left. Your line is picked where it stands.",
        view: () => <DialogueB />,
      },
      {
        id: "C",
        name: "Listen first",
        choices: "The chat, but Mari's lines arrive as sound only; her words show on request.",
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
                  Each has three options. Switch between them, try them, and tell me a letter for each. The Estonian comes from lessons 1–5: pronouns, olema, the present tense, ei and kas.
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
