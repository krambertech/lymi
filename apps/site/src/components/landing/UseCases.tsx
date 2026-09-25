import { useLingui } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { SampleCard } from "./cards";

export interface UseCase {
  id: string;
  title: ReactNode;
  body: ReactNode;
  card: SampleCard;
  /** The use case's own page, once it exists. */
  link?: { href: string; label: ReactNode } | null | undefined;
}

interface Props {
  title: ReactNode;
  items: readonly UseCase[];
}

function CardFace({ card }: { card: SampleCard }) {
  const { i18n } = useLingui();
  return (
    <div className="order-first mb-5 flex min-h-44 flex-col rounded-xl bg-plate p-5 edge @4xl:min-h-52">
      <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
        {i18n._(card.label)}
      </p>
      <p
        lang={card.language}
        className="mt-2.5 text-3xl leading-[1.05] font-medium tracking-[-0.03em] text-balance text-text [overflow-wrap:anywhere]"
      >
        {card.term}
      </p>
      <p className="mt-auto border-t border-edge-2 pt-3 text-sm text-pretty text-text-2">
        {i18n._(card.meaning)}
      </p>
    </div>
  );
}

/** What people keep in Lymi, each with a real card and, where one exists, a page of its own. */
export function UseCases({ title, items }: Props) {
  return (
    <section
      aria-labelledby="use-cases-title"
      className="border-t border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="use-cases-title"
          className="max-w-[20ch] text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl @4xl:max-w-none"
        >
          {title}
        </h2>

        <ul className="mt-12 grid gap-x-4 gap-y-10 @xl:grid-cols-2 @4xl:grid-cols-4">
          {items.map((item) => (
            <li id={`use-case-${item.id}`} key={item.id} className="flex flex-col">
              <h3 className="text-lg font-medium tracking-[-0.02em] text-text">{item.title}</h3>
              <p className="mt-2 max-w-[34ch] text-sm text-pretty text-muted">{item.body}</p>
              <CardFace card={item.card} />
              {item.link && (
                <a
                  href={item.link.href}
                  className="group mt-4 inline-flex items-center gap-1.5 self-start rounded-xs text-sm font-medium text-text"
                >
                  {item.link.label}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 ease-out hoverable:group-hover:translate-x-0.5"
                  />
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
