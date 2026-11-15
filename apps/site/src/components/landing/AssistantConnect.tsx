import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { buttonClass } from "../Button";
import { ArrowLink } from "./ArrowLink";
import { SectionTitle } from "./FeatureSection";

export interface ConnectStep {
  id: string;
  title: ReactNode;
  body: ReactNode;
  /** What the step looks like, or what to copy. */
  after?: ReactNode;
}

interface Props {
  title: ReactNode;
  /** Who can connect, and anything the assistant's plan decides. */
  note: ReactNode;
  steps: readonly ConnectStep[];
  /** The full setup guide in the docs. */
  guide: string;
  name: string;
  /** Lymi's listing in the assistant's directory: when there is one, it comes before the steps. */
  listing?: string | undefined;
}

/** One assistant's own setup, in the order it asks for things. */
export function AssistantConnect({ title, note, steps, guide, name, listing }: Props) {
  return (
    <section
      id="connect"
      aria-labelledby="connect-title"
      className="scroll-mt-8 bg-plate-nested px-5 py-16 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[640px]">
          <div id="connect-title">
            <SectionTitle>{title}</SectionTitle>
          </div>
          <p className="mt-5 text-md text-pretty text-ink-secondary">{note}</p>
          {listing && (
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href={listing} className={buttonClass("primary", "lg")}>
                <Trans>Add Lymi to {name}</Trans>
              </a>
              <p className="text-sm text-ink-secondary">
                <Trans>Or add it by hand:</Trans>
              </p>
            </div>
          )}
        </div>
        <ol
          className="mt-10 grid gap-4 @3xl:grid-flow-col @3xl:grid-rows-[auto_1fr_auto] @3xl:gap-x-4 @3xl:gap-y-0"
          style={{ gridAutoColumns: "minmax(0, 1fr)" }}
        >
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="grid min-w-0 gap-3 rounded-2xl bg-plate p-5 edge @3xl:row-span-3 @3xl:grid-rows-subgrid @3xl:gap-0"
            >
              <h3 className="flex items-center gap-3 text-lg font-medium tracking-[-0.02em] text-ink">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-plate-nested text-sm text-ink-secondary tabular-nums"
                >
                  {i + 1}
                </span>
                {step.title}
              </h3>
              <p className="text-md text-pretty text-ink-secondary @3xl:mt-2">{step.body}</p>
              <div className="mt-3 min-w-0 @3xl:mt-6">{step.after}</div>
            </li>
          ))}
        </ol>
        <ArrowLink href={guide} size="md" className="mt-8">
          <Trans>Full setup guide</Trans>
        </ArrowLink>
      </div>
    </section>
  );
}
