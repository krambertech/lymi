import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { localizedPath } from "../../lib/routes";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { ASSISTANT_KEYS, ASSISTANT_PAGES, type AssistantKey } from "./assistant-pages";

interface Props {
  title: ReactNode;
  /** The page this sits on, left out of the list. Without it, every assistant is listed. */
  current?: AssistantKey | undefined;
}

/** A neutral tray for apps that aren't one of the four. */
const OTHER_HUE = 60;

function Tile({
  href,
  hue,
  mark,
  children,
}: {
  href: string;
  hue: number;
  mark: AssistantName;
  children: ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        style={{ "--tray-h": hue } as CSSProperties}
        className="use-case-tile group flex h-16 items-center gap-3 rounded-2xl ps-3 pe-4 transition-[translate] duration-200 ease-out hoverable:hover:-translate-y-0.5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-plate edge-drop [&_svg]:size-5">
          <AssistantMark name={mark} />
        </span>
        <span className="min-w-0 flex-1 truncate text-md font-medium text-ink">{children}</span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-secondary transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:-scale-x-100"
        />
      </a>
    </li>
  );
}

/** Each assistant's own page on its tray, then any other app that speaks MCP. */
export function OtherAssistants({ title, current }: Props) {
  const { i18n } = useLingui();
  const others = ASSISTANT_KEYS.filter((key) => key !== current);

  return (
    <section data-nav="assistant_pages" className="px-5 py-16 @2xl:px-10 @4xl:py-20">
      <div className="mx-auto max-w-[1040px]">
        <h2 className="text-2xl font-medium tracking-[-0.025em] text-ink">{title}</h2>
        <ul
          className={clsx(
            "mt-6 grid gap-3 @2xl:grid-cols-2",
            others.length === 3 ? "@4xl:grid-cols-4" : "@4xl:grid-cols-5",
          )}
        >
          {others.map((key) => {
            const other = ASSISTANT_PAGES[key];
            return (
              <Tile
                key={key}
                href={localizedPath(other.page, i18n.locale)}
                hue={other.hue}
                mark={other.name}
              >
                {other.name}
              </Tile>
            );
          })}
          <Tile href="/docs/mcp" hue={OTHER_HUE} mark="Other apps">
            <Trans>Other MCP apps</Trans>
          </Tile>
        </ul>
      </div>
    </section>
  );
}
