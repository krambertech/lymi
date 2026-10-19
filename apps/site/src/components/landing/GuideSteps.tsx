import { Trans } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { signUpUrl } from "../../lib/origins";
import { SectionTitle } from "./FeatureSection";

export interface GuideStep {
  id: string;
  title: ReactNode;
  body: ReactNode;
}

interface Props {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  steps: GuideStep[];
  /** A plain line beside the steps: what the guide can't do, said once. */
  note?: ReactNode;
  /** The ways in for a learner without an assistant, beside the steps. */
  withoutAssistant?: boolean;
}

/** A how-to in numbered steps on one rail, each one a thing the learner does in Lymi or their assistant. */
export function GuideSteps({ id, title, lede, steps, note, withoutAssistant }: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto grid max-w-[1040px] gap-x-20 gap-y-12 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @4xl:grid-rows-[auto_1fr]">
        <div>
          <div id={`${id}-title`}>
            <SectionTitle>{title}</SectionTitle>
          </div>
          {lede && <p className="mt-5 max-w-[46ch] text-md text-pretty text-text-2">{lede}</p>}
        </div>
        <ol className="@4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0"
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute start-4 top-10 bottom-1 w-px -translate-x-1/2 bg-edge-2 rtl:translate-x-1/2"
                />
              )}
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-plate text-sm font-medium text-text tabular-nums edge"
              >
                {i + 1}
              </span>
              <div className="pt-0.5">
                <h3 className="text-lg font-medium tracking-[-0.02em] text-text">{step.title}</h3>
                <p className="mt-1.5 max-w-[52ch] text-md text-pretty text-text-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {(note || withoutAssistant) && (
          <div className="-mt-2 grid content-start gap-8 @4xl:mt-0">
            {withoutAssistant && <WithoutAssistant id={`${id}-without`} />}
            {note && <p className="max-w-[46ch] text-sm text-pretty text-muted">{note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

const wayClass =
  "group flex items-center gap-4 rounded-lg bg-plate px-4 py-3.5 edge transition-colors duration-150 hoverable:hover:bg-plate-2";

/** Ways to start that need no assistant: typing cards in, Smart add, or bringing an Anki deck across. */
function WithoutAssistant({ id }: { id: string }) {
  return (
    <div id={id} className="scroll-mt-8">
      <h3 className="text-lg font-medium tracking-[-0.02em] text-text">
        <Trans>No assistant?</Trans>
      </h3>
      <ul className="mt-3 grid max-w-[30rem] gap-2">
        <li>
          <a href={signUpUrl()} className={wayClass}>
            <span className="min-w-0 flex-1">
              <span className="block text-md font-medium text-text">
                <Trans>Add cards yourself</Trans>
              </span>
              <span className="mt-0.5 block text-sm text-pretty text-text-2">
                <Trans>Type each term, and AI fills in the meaning.</Trans>
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted rtl:-scale-x-100"
            />
          </a>
        </li>
        <li>
          <a href={signUpUrl()} className={wayClass}>
            <span className="min-w-0 flex-1">
              <span className="block text-md font-medium text-text">
                <Trans>Use Smart add</Trans>
              </span>
              <span className="mt-0.5 block text-sm text-pretty text-text-2">
                <Trans>Add a photo, PDF or transcript, and tick the words you want.</Trans>
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted rtl:-scale-x-100"
            />
          </a>
        </li>
        <li>
          <a href="/docs/import-from-anki" className={wayClass}>
            <span className="min-w-0 flex-1">
              <span className="block text-md font-medium text-text">
                <Trans>Import from Anki</Trans>
              </span>
              <span className="mt-0.5 block text-sm text-pretty text-text-2">
                <Trans>Bring your decks across with their review history.</Trans>
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted rtl:-scale-x-100"
            />
          </a>
        </li>
      </ul>
    </div>
  );
}
