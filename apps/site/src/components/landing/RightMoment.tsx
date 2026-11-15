import type { ReactNode } from "react";
import { SectionTitle } from "./FeatureSection";
import { WhyItWorks } from "./WhyItWorks";

interface Props {
  title: ReactNode;
  body: ReactNode;
}

/** The scheduling idea and its research, centred above the curve. */
export function RightMoment({ title, body }: Props) {
  return (
    <section className="px-5 py-16 @2xl:px-10 @4xl:py-20">
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[680px] text-center">
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-5 text-md text-ink-secondary">{body}</p>
        </div>
        <div className="mt-14">
          <WhyItWorks />
        </div>
      </div>
    </section>
  );
}
