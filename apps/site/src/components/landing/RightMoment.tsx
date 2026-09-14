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
    <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[680px] text-center">
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-5 text-md text-text-2">{body}</p>
        </div>
        <div className="mt-14">
          <WhyItWorks />
        </div>
      </div>
    </section>
  );
}
