import type { MessageDescriptor } from "@lingui/core";
import { createContext, useContext } from "react";
import { clipId, clipUrl } from "../../lib/learn/clips";

/** What a lesson says about one of its Estonian words. */
export interface Gloss {
  /** The meaning, in the page's language. */
  en: MessageDescriptor;
  /** One short line more: another meaning, where the form comes from. */
  note?: MessageDescriptor | undefined;
  /** How it is written when that differs from its key, such as a capital: Tallinn. */
  show?: string | undefined;
  /** Its clip id when that isn't the word's own, or false when it has none. */
  clip?: string | false | undefined;
}

export type Glossary = Readonly<Record<string, Gloss>>;

export interface LessonContextValue {
  slug: string;
  glossary: Glossary;
  /** Marks a section done; a quiz calls it when it finishes. */
  finishSection: (section: string) => void;
}

export const LessonContext = createContext<LessonContextValue | null>(null);
/** The section a component sits in, so a quiz can mark it done. */
export const SectionContext = createContext<string | null>(null);

export function useLesson(): LessonContextValue {
  const lesson = useContext(LessonContext);
  if (!lesson) throw new Error("A lesson part needs a LessonContext.");
  return lesson;
}

/** A clip of this lesson by id. */
export function useClip(): (id: string) => string {
  const { slug } = useLesson();
  return (id) => clipUrl(slug, id);
}

/** A word's gloss and clip; a word without a gloss still plays its own clip. */
export function useWord(word: string): {
  gloss: Gloss | undefined;
  src: string | null;
  show: string;
} {
  const { slug, glossary } = useLesson();
  const key = word.toLowerCase();
  const gloss = glossary[key];
  const clip = gloss?.clip === false ? null : (gloss?.clip ?? clipId(key));
  return { gloss, src: clip ? clipUrl(slug, clip) : null, show: gloss?.show ?? word };
}
