import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { AudioLines, LifeBuoy, NotebookPen, PencilLine, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { type DemoProps, HintDemo, LeadDemo, LessonDemo, VoiceDemo, WordDemo } from "./AiDemos";
import { Section } from "./Section";
import { Showcase, useShowcaseStage } from "./Showcase";

interface Item {
  id: string;
  icon: ReactNode;
  title: MessageDescriptor;
  body: MessageDescriptor;
  /** The tray hue behind the demo, from Explore's shelf colours. */
  hue: number;
  Demo: (props: DemoProps) => ReactNode;
  /** How long the item stays: its demo to the end, then about 1.5 s to read the result. */
  dwell: number;
}

/** The tray swaps its demo out before the next one starts, so each dwell allows for it. */
const SWAP_MS = 400;

const ITEMS: Item[] = [
  {
    id: "notes",
    icon: <NotebookPen />,
    dwell: 5600,
    title: msg`From your notes`,
    body: msg`Take a photo of your notes or add a PDF. AI picks out the terms worth learning and skips the ones you already have.`,
    hue: 110,
    Demo: LessonDemo,
  },
  {
    id: "fill",
    icon: <PencilLine />,
    dwell: 6400,
    title: msg`A full card in seconds`,
    body: msg`Type a word, and AI adds the meaning, an example and notes. Everything it adds is marked.`,
    hue: 25,
    Demo: WordDemo,
  },
  {
    id: "lead",
    icon: <SlidersHorizontal />,
    dwell: 5600,
    title: msg`AI follows your lead`,
    body: msg`Give a deck instructions, or let AI follow the way you already write your cards.`,
    hue: 280,
    Demo: LeadDemo,
  },
  {
    id: "voice",
    icon: <AudioLines />,
    dwell: 4500,
    title: msg`Native AI voice`,
    body: msg`Hear every card read aloud the way a native speaker says it.`,
    hue: 320,
    Demo: VoiceDemo,
  },
  {
    id: "hint",
    icon: <LifeBuoy />,
    dwell: 4800,
    title: msg`A hint for the word you forget`,
    body: msg`When a word won’t stick, AI drafts a short hint that leads you back to it without spelling it out.`,
    hue: 235,
    Demo: HintDemo,
  },
];

/** A demo on the tray, playing while the Showcase says it may. */
function Staged({ Demo }: { Demo: Item["Demo"] }) {
  const { playing } = useShowcaseStage();
  return <Demo play={playing} />;
}

/** What AI does for a card: the tray on one side, the list of what it does on the other. */
export function AiGallery() {
  const { i18n, t } = useLingui();
  return (
    <Section nav="landing">
      <Section.Header>
        <Section.Title>
          <Trans>AI does the busywork. You do the remembering.</Trans>
        </Section.Title>
        <Section.Body>
          <Trans>
            AI turns your notes into cards and fills in what you leave out, the way you set it up.
            It never changes what you wrote, and everything it adds is marked.
          </Trans>
        </Section.Body>
      </Section.Header>
      <Showcase
        label={t`What AI does for your cards`}
        tray="start"
        // Narrow, the notes demo stacks and is the tallest; the tray holds that height for all five.
        trayClassName="min-h-[540px] @2xl:min-h-[440px] @4xl:min-h-[480px]"
        className="mt-12 @4xl:mt-14"
      >
        {ITEMS.map((item) => (
          <Showcase.Item
            key={item.id}
            id={item.id}
            icon={item.icon}
            title={i18n._(item.title)}
            description={i18n._(item.body)}
            hue={item.hue}
            dwell={item.dwell + SWAP_MS}
          >
            <Staged Demo={item.Demo} />
          </Showcase.Item>
        ))}
      </Showcase>
    </Section>
  );
}
