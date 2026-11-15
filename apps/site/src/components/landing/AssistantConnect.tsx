import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { buttonClass } from "../Button";
import { ArrowLink } from "./ArrowLink";
import { Section } from "./Section";
import { type Step, Steps } from "./Steps";

interface Props {
  title: ReactNode;
  /** Who can connect, and anything the assistant's plan decides. */
  note: ReactNode;
  steps: readonly Step[];
  /** The full setup guide in the docs. */
  guide: string;
  name: string;
  /** Lymi's listing in the assistant's directory: when there is one, it comes before the steps. */
  listing?: string | undefined;
}

/** One assistant's own setup, in the order it asks for things. */
export function AssistantConnect({ title, note, steps, guide, name, listing }: Props) {
  return (
    <Section id="connect" surface="nested">
      <Section.Header>
        <Section.Title>{title}</Section.Title>
        <Section.Body>{note}</Section.Body>
        {listing && (
          <Section.After>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href={listing} className={buttonClass("primary", "lg")}>
                <Trans>Add Lymi to {name}</Trans>
              </a>
              <p className="text-sm text-ink-secondary">
                <Trans>Or add it by hand:</Trans>
              </p>
            </div>
          </Section.After>
        )}
      </Section.Header>
      <div className="mt-10">
        <Steps steps={steps} />
      </div>
      <ArrowLink href={guide} size="md" className="mt-8">
        <Trans>Full setup guide</Trans>
      </ArrowLink>
    </Section>
  );
}
