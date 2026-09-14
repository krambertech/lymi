import { Trans, useLingui } from "@lingui/react/macro";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { Lockup } from "../Logo";

interface Props {
  openAppUrl: string;
  current?: "languages" | "assistants" | undefined;
}

/** The marketing pages' top bar. Docs and the use case pages collapse into the footer on a phone. */
export function SiteNav({ openAppUrl, current }: Props) {
  const { t, i18n } = useLingui();

  return (
    <nav
      aria-label={t`Main navigation`}
      className="mx-auto flex max-w-[1120px] items-center justify-between px-5 pt-5 @2xl:px-10 @2xl:pt-7"
    >
      <a
        href={localizedPath("landing", i18n.locale)}
        aria-label={t`Lymi home`}
        className="rounded-xs py-1.5"
      >
        <Lockup size={30} flicker glow />
      </a>
      <div className="flex items-center gap-1">
        <span className="hidden @2xl:contents">
          <a
            href={localizedPath("languages", i18n.locale)}
            aria-current={current === "languages" ? "page" : undefined}
            className={buttonClass("ghost", "sm", "aria-[current=page]:text-text")}
          >
            <Trans>Language learning</Trans>
          </a>
        </span>
        <span className="hidden @3xl:contents">
          <a
            href={localizedPath("assistants", i18n.locale)}
            aria-current={current === "assistants" ? "page" : undefined}
            className={buttonClass("ghost", "sm", "aria-[current=page]:text-text")}
          >
            <Trans>AI assistants</Trans>
          </a>
        </span>
        <a href="/docs" className={buttonClass("ghost", "sm")}>
          <Trans>Docs</Trans>
        </a>
        <span className="hidden @2xl:contents">
          <a href={openAppUrl} className={buttonClass("ghost", "sm")}>
            <Trans>Open Lymi</Trans>
          </a>
        </span>
        <a href="#join" className={buttonClass("secondary", "sm")}>
          <Trans>Request access</Trans>
        </a>
      </div>
    </nav>
  );
}
