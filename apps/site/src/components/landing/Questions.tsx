import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { ArrowLink } from "./ArrowLink";
import { type Question, questionLinkHref } from "./faq";
import { Section } from "./Section";

interface Props {
  title: ReactNode;
  items: readonly Question[];
}

/** Plain answers, all open, so nobody has to click to find out what something costs. */
export function Questions({ title, items }: Props) {
  const { i18n } = useLingui();
  return (
    <Section>
      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] @4xl:gap-20">
        <Section.Header measure="narrow">
          <Section.Title>{title}</Section.Title>
        </Section.Header>
        <dl className="border-t border-edge">
          {items.map((item) => (
            <div key={item.id} className="border-b border-edge py-6">
              <dt className="text-lg font-medium tracking-[-0.02em] text-ink">
                {i18n._(item.question)}
              </dt>
              <dd className="mt-2 max-w-[60ch] text-md text-pretty text-ink-secondary">
                <p>{i18n._(item.answer)}</p>
                {item.link && (
                  <ArrowLink href={questionLinkHref(item.link, i18n.locale)} className="mt-2">
                    {i18n._(item.link.label)}
                  </ArrowLink>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
