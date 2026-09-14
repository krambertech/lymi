import type { ReactNode } from "react";
import { SectionTitle } from "./FeatureSection";

export interface Question {
  id: string;
  question: ReactNode;
  answer: ReactNode;
}

interface Props {
  title: ReactNode;
  items: readonly Question[];
}

/** Plain answers, all open, so nobody has to click to find out what something costs. */
export function Questions({ title, items }: Props) {
  return (
    <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto grid max-w-[1040px] gap-10 @4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] @4xl:gap-20">
        <div className="max-w-[440px]">
          <SectionTitle>{title}</SectionTitle>
        </div>
        <dl className="border-t border-edge">
          {items.map((item) => (
            <div key={item.id} className="border-b border-edge py-6">
              <dt className="text-lg font-medium tracking-[-0.02em] text-text">{item.question}</dt>
              <dd className="mt-2 max-w-[60ch] text-md text-pretty text-text-2">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
