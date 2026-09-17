import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import type { Locale } from "../../lib/routes";
import { SiteFooter } from "../landing/SiteFooter";

interface LocaleProps {
  locale: Locale;
}

function Localized({ locale, children }: LocaleProps & { children: ReactNode }) {
  return <I18nProvider i18n={pageI18n(locale)}>{children}</I18nProvider>;
}

/** The page's one idea: search. The light behind it is the lantern's, and nothing here is amber. */
export function ExploreHeading({ locale }: LocaleProps) {
  return (
    <Localized locale={locale}>
      <h1 className="mx-auto max-w-[14ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance text-text @2xl:text-[3.5rem] @4xl:text-[4rem]">
        <Trans>Flashcard decks, ready to learn</Trans>
      </h1>
      <p className="mx-auto mt-5 max-w-[42ch] text-lg text-pretty text-text-2 @2xl:text-xl">
        <Trans>
          Add one and learn it for free — Lymi brings each card back right before you’d forget it.
        </Trans>
      </p>
    </Localized>
  );
}

/** A catalogue with nothing in it yet. Only reachable before the first deck is published. */
export function ExploreEmpty({ locale }: LocaleProps) {
  return (
    <Localized locale={locale}>
      <div className="mx-auto max-w-[46ch] py-20 text-center">
        <p className="text-xl font-medium tracking-[-0.02em] text-balance text-text">
          <Trans>There is nothing published yet.</Trans>
        </p>
        <p className="mt-3 text-md text-pretty text-text-2">
          <Trans>
            Lymi is writing the first decks now. In the meantime you can make your own and share it
            with anyone.
          </Trans>
        </p>
      </div>
    </Localized>
  );
}

export function ExploreFooter({ locale, paths }: LocaleProps & { paths: Record<Locale, string> }) {
  return (
    <Localized locale={locale}>
      <SiteFooter openAppUrl={productUrl()} paths={paths} />
    </Localized>
  );
}
