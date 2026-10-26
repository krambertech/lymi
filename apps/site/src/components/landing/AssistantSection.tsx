import { Trans, useLingui } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { localizedPath } from "../../lib/routes";
import { Lantern } from "../Lantern";
import { ArrowLink } from "./ArrowLink";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { SectionTitle } from "./FeatureSection";
import { EASE, useStill } from "./playback";

interface Ask {
  id: string;
  from: AssistantName;
  ask: ReactNode;
  /** What Lymi did, as the assistant reports it. */
  did: ReactNode;
}

function useAsks(): Ask[] {
  return [
    {
      id: "pdf",
      from: "Claude",
      ask: <Trans>Make cards from the new terms in this PDF.</Trans>,
      did: <Trans>Added 8 cards to Biology</Trans>,
    },
    {
      id: "deck",
      from: "ChatGPT",
      ask: <Trans>Make me a Portuguese deck for a week in Lisbon, a section a day.</Trans>,
      did: (
        <Trans>
          Made <span lang="pt">Lisboa a dois</span>: 42 cards in 5 sections
        </Trans>
      ),
    },
    {
      id: "due",
      from: "Gemini",
      ask: <Trans>What should I review tonight?</Trans>,
      did: <Trans>12 cards due, about five minutes</Trans>,
    },
    {
      id: "forget",
      from: "Grok",
      ask: <Trans>Which words do I keep forgetting?</Trans>,
      did: (
        <Trans>
          <span lang="de">aufhören</span>, <span lang="de">Schnapsidee</span> and{" "}
          <span lang="de">die Gewerkschaft</span>
        </Trans>
      ),
    },
  ];
}

/** Four things a learner asks their assistant, each with what Lymi did, arriving one by one. */
function AskList() {
  const asks = useAsks();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const still = useStill();
  const shown = inView || still;
  return (
    <ul ref={ref} className="grid w-full max-w-[440px] gap-2">
      {asks.map((each, i) => (
        <motion.li
          key={each.id}
          initial={still ? false : { opacity: 0, y: 12 }}
          animate={shown ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: EASE, delay: i * 0.4 }}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-2xl bg-plate px-4 py-3 edge"
        >
          <span className="mt-0.5 grid size-6 place-items-center [&_svg]:size-[18px]">
            <AssistantMark name={each.from} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-pretty text-text">{each.ask}</span>
            <motion.span
              initial={still ? false : { opacity: 0, y: 4 }}
              animate={shown ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.4 + 0.5 }}
              className="mt-1 flex items-start gap-1.5 text-xs text-pretty text-text-2"
            >
              <Lantern className="mt-px size-3.5 shrink-0" />
              <span>{each.did}</span>
            </motion.span>
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

const GUIDE_MARKS: AssistantName[] = ["Claude", "ChatGPT", "Gemini", "Grok"];

/** Lymi inside the assistant a learner already uses: the claim on the page, the asks on a tray. */
export function AssistantSection() {
  const { i18n } = useLingui();
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto grid max-w-[1040px] items-center gap-10 @4xl:grid-cols-2 @4xl:gap-14">
        <div>
          <SectionTitle>
            <Trans>Works with the AI you already use.</Trans>
          </SectionTitle>
          <p className="mt-5 max-w-[44ch] text-md text-pretty text-text-2">
            <Trans>
              Connect Claude, ChatGPT, Gemini or Grok once, then do most of it from the chat. You
              still review in Lymi.
            </Trans>
          </p>
          <div className="mt-7 flex items-center gap-3">
            <span aria-hidden="true" className="flex">
              {GUIDE_MARKS.map((name) => (
                <span
                  key={name}
                  className="-ms-1.5 grid size-8 place-items-center rounded-full bg-plate text-text edge first:ms-0 [&_svg]:size-4"
                >
                  <AssistantMark name={name} />
                </span>
              ))}
            </span>
            <ArrowLink href={localizedPath("assistants", i18n.locale)}>
              <Trans>Lymi with AI assistants</Trans>
            </ArrowLink>
          </div>
        </div>
        <div
          style={{ "--tray-h": 280 } as CSSProperties}
          className="use-case-tile grid min-h-[380px] place-items-center rounded-[24px] p-6 @2xl:p-8"
        >
          <AskList />
        </div>
      </div>
    </section>
  );
}
