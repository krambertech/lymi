import type { ReactNode } from "react";
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
  /** A plain line under the steps: what the guide can't do, said once. */
  note?: ReactNode;
}

/** A how-to in numbered steps, each one a thing the learner does in Lymi or their assistant. */
export function GuideSteps({ id, title, lede, steps, note }: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[760px]">
        <div id={`${id}-title`}>
          <SectionTitle>{title}</SectionTitle>
        </div>
        {lede && <p className="mt-5 max-w-[56ch] text-md text-pretty text-text-2">{lede}</p>}
        <ol className="mt-10 grid gap-4">
          {steps.map((step, i) => (
            <li key={step.id} className="flex gap-4 rounded-2xl bg-plate p-5 edge">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-plate-2 text-sm font-medium text-text edge"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-medium tracking-[-0.02em] text-text">{step.title}</h3>
                <p className="mt-1.5 text-md text-pretty text-text-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {note && <p className="mt-6 text-sm text-pretty text-muted">{note}</p>}
      </div>
    </section>
  );
}
