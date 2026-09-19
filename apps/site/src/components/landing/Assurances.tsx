import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface Assurance {
  id: string;
  icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
}

interface Props {
  /** Names the section for screen readers; the three headings speak for it on screen. */
  label: ReactNode;
  items: readonly Assurance[];
}

/** The practical doubts a visitor has before signing up, answered in one row. */
export function Assurances({ label, items }: Props) {
  return (
    <section aria-labelledby="assurances-title" className="px-5 pt-16 @2xl:px-10 @4xl:pt-24">
      <h2 id="assurances-title" className="sr-only">
        {label}
      </h2>
      <ul className="mx-auto grid max-w-[1040px] gap-10 @2xl:grid-cols-3 @2xl:gap-8 @4xl:gap-12">
        {items.map(({ id, icon: Icon, title, body }) => (
          <li key={id}>
            <Icon aria-hidden="true" strokeWidth={1.5} className="size-7 text-amber-text" />
            <h3 className="mt-5 text-lg font-medium tracking-[-0.02em] text-text">{title}</h3>
            <p className="mt-2 max-w-[34ch] text-base text-pretty text-text-2">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
