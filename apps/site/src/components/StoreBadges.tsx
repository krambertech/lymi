import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { downloadHref } from "../lib/downloads";
import { AppleMark } from "./GetTheApp";
import { Localized } from "./Localized";

/** Apple has no Ukrainian badge, so Ukrainian pages show the English one, as Apple's guide allows. */
const APP_STORE_BADGE: Record<string, string> = { ru: "ru" };
const GOOGLE_PLAY_BADGE: Record<string, string> = { uk: "uk", ru: "ru" };

/** EU visitors ask here to join the iPhone beta; the subject stays English so the inbox can sort it. */
const TESTFLIGHT_MAIL = "mailto:hello@lymi.app?subject=Lymi%20on%20TestFlight";

interface Props {
  /** One store's badge, for an update about that phone's app; both when left out. */
  only?: "app-store" | "google-play" | undefined;
  /** 40 px is the smallest height either store allows. */
  size?: "md" | "lg" | undefined;
  className?: string | undefined;
}

/**
 * The stores' own badges, unaltered, each linking through its counted download route. The App
 * Store badge starts hidden and shows where the App Store sells Lymi; where it does not, the note
 * under the badges says so and offers TestFlight instead (`showAppStoreLinks`).
 */
export function StoreBadges({ only, size = "md", className }: Props) {
  const { i18n, t } = useLingui();
  const locale = i18n.locale;
  const height = size === "lg" ? "h-12" : "h-10";
  const withAppStore = only !== "google-play";
  return (
    <div className="flex flex-col gap-3">
      {/* Shown once a badge in it is: an iPhone-only row stays out of the layout in the EU. */}
      <div
        className={clsx(
          "hidden flex-wrap items-center gap-3 has-[>:not([hidden])]:flex",
          className,
        )}
      >
        {withAppStore && (
          <a
            href={downloadHref("/download/iphone", locale)}
            data-app-store=""
            hidden
            suppressHydrationWarning
            className="rounded-[9px] transition-opacity duration-150 ease-out hoverable:hover:opacity-85"
          >
            <img
              src={`/badges/app-store-${APP_STORE_BADGE[locale] ?? "en"}.svg`}
              alt={t`Download on the App Store`}
              width={120}
              height={40}
              className={clsx("relative! block w-auto", height)}
            />
          </a>
        )}
        {only !== "app-store" && (
          <a
            href={downloadHref("/download/android", locale)}
            className="rounded-[9px] transition-opacity duration-150 ease-out hoverable:hover:opacity-85"
          >
            <img
              src={`/badges/google-play-${GOOGLE_PLAY_BADGE[locale] ?? "en"}.png`}
              alt={t`Get it on Google Play`}
              width={135}
              height={40}
              className={clsx("relative! block w-auto", height)}
            />
          </a>
        )}
      </div>
      {withAppStore && (
        <p
          data-app-store-missing=""
          hidden
          suppressHydrationWarning
          className="flex max-w-[660px] gap-3 rounded-xl bg-plate px-4 py-3.5 text-start text-base text-pretty text-ink edge"
        >
          <AppleMark className="mt-[5px] size-4 text-ink-secondary" />
          <span>
            <Trans>
              Lymi for iPhone isn’t on the App Store in EU countries yet. It should be there in the
              coming weeks. Until then,{" "}
              <a
                href={TESTFLIGHT_MAIL}
                className="font-medium text-ink underline decoration-edge-strong underline-offset-4 hoverable:hover:decoration-current"
              >
                email us
              </a>{" "}
              to try it on TestFlight.
            </Trans>
          </span>
        </p>
      )}
    </div>
  );
}

/** The badges on an Astro page, which hands each React part its language on its own. */
export function StoreBadgesIn({ locale, ...props }: Props & { locale: string }) {
  return (
    <Localized locale={locale}>
      <StoreBadges {...props} />
    </Localized>
  );
}
