import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { localizedPath } from "../../lib/routes";
import { AssistantMark } from "./AssistantMarks";
import { ASSISTANT_KEYS, ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";

interface Props {
  title: ReactNode;
  /** The page this sits on, left out of the list. Without it, every assistant is listed. */
  current?: AssistantKey | undefined;
}

/** Each assistant's own page on its tray, and from one of them, the page about all of them. */
export function OtherAssistants({ title, current }: Props) {
  const { i18n } = useLingui();
  const others = ASSISTANT_KEYS.filter((key) => key !== current);

  return (
    <section className="border-b border-edge px-5 py-16 @2xl:px-10">
      <div className="mx-auto max-w-[1040px]">
        <h2 className="text-2xl font-medium tracking-[-0.025em] text-ink">{title}</h2>
        <ul
          className={clsx(
            "mt-6 grid gap-3",
            others.length === 3 ? "@2xl:grid-cols-3" : "@2xl:grid-cols-2 @4xl:grid-cols-4",
          )}
        >
          {others.map((key) => {
            const other = ASSISTANT_PAGES[key];
            return (
              <li key={key}>
                <a
                  href={localizedPath(other.page, i18n.locale)}
                  style={{ "--tray-h": other.hue } as CSSProperties}
                  className="use-case-tile group flex h-16 items-center gap-3 rounded-2xl ps-3 pe-4 transition-[translate] duration-200 ease-out hoverable:hover:-translate-y-0.5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-plate edge-drop [&_svg]:size-5">
                    <AssistantMark name={other.name} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-md font-medium text-ink">
                    {i18n._(other.linkLabel)}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-ink-secondary transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:-scale-x-100"
                  />
                </a>
              </li>
            );
          })}
        </ul>
        {current && (
          <a
            href={localizedPath("assistants", i18n.locale)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-ink-secondary hoverable:hover:text-ink"
          >
            <Trans>Every assistant that works with Lymi</Trans>
            <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
          </a>
        )}
      </div>
    </section>
  );
}
