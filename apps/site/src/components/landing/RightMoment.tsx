import type { ReactNode } from "react";
import { Section, SectionHeader } from "./Section";
import { WhyItWorks } from "./WhyItWorks";

interface Props {
  title: ReactNode;
  body: ReactNode;
}

/** The scheduling idea and its research, centred above the curve. */
export function RightMoment({ title, body }: Props) {
  return (
    <Section>
      <SectionHeader title={title} body={body} align="center" />
      <div className="mt-14">
        <WhyItWorks />
      </div>
    </Section>
  );
}
