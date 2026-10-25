import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { AudioLines, NotebookPen, PenLine, Sparkles } from "lucide-react";
import { LessonScene, WordScene } from "./CardScenes";
import { SectionTitle } from "./FeatureSection";
import { FeatureStage, LeadDemo, type StageItem, VoiceDemo } from "./FeatureStage";

const ITEMS: StageItem[] = [
  {
    id: "notes",
    icon: NotebookPen,
    title: msg`From your notes`,
    body: msg`Take a photo of your notes or add a PDF. AI picks out the terms worth learning and skips the ones you already have.`,
    hue: 110,
    Demo: LessonScene,
  },
  {
    id: "fill",
    icon: PenLine,
    title: msg`A full card in seconds`,
    body: msg`Type a word, and AI adds the meaning, an example and a hint. Everything it adds is marked.`,
    hue: 25,
    Demo: WordScene,
  },
  {
    id: "lead",
    icon: Sparkles,
    title: msg`AI follows your lead`,
    body: msg`Give a deck instructions, or let AI follow the way you already write your cards.`,
    hue: 280,
    Demo: LeadDemo,
  },
  {
    id: "voice",
    icon: AudioLines,
    title: msg`Native AI voice`,
    body: msg`Hear every card read aloud the way a native speaker says it.`,
    hue: 320,
    Demo: VoiceDemo,
  },
];

/** What AI does for a card, one thing at a time on a timed gallery. */
export function AiGallery() {
  return (
    <section data-nav="landing" className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[640px]">
          <SectionTitle>
            <Trans>AI does the busywork. You do the remembering.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>
              AI turns your notes into cards and fills in what you leave out, the way you set it up.
              It never changes what you wrote, and everything it adds is marked.
            </Trans>
          </p>
        </div>
        <FeatureStage items={ITEMS} />
      </div>
    </section>
  );
}
