import type { ReactNode } from "react";
import { Section } from "./Section";
import { WhyItWorks } from "./WhyItWorks";

interface Props {
  title: ReactNode;
  body: ReactNode;
}

/** The scheduling idea and its research, centred above the curve. */
export function RightMoment({ title, body }: Props) {
  return (
    <Section>
      <Section.Header align="center">
        <Section.Title>{title}</Section.Title>
        <Section.Body>{body}</Section.Body>
      </Section.Header>
      <div className="mt-14">
        <WhyItWorks />
      </div>
    </Section>
  );
}
