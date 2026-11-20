import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { downloadHref } from "../lib/downloads";
import { Localized } from "./Localized";

/** Apple has no Ukrainian badge, so Ukrainian pages show the English one, as Apple's guide allows. */
const APP_STORE_BADGE: Record<string, string> = { ru: "ru" };
const GOOGLE_PLAY_BADGE: Record<string, string> = { uk: "uk", ru: "ru" };

interface Props {
  /** Google Play first on the Android update, the App Store first everywhere else. */
  first?: "app-store" | "google-play" | undefined;
  /** 40 px is the smallest height either store allows. */
  size?: "md" | "lg" | undefined;
  className?: string | undefined;
}

/**
 * The stores' own badges, unaltered, each linking through its counted download route. The App
 * Store badge starts hidden and shows where the App Store sells Lymi (`showAppStoreLinks`).
 */
export function StoreBadges({ first = "app-store", size = "md", className }: Props) {
  const { i18n, t } = useLingui();
  const locale = i18n.locale;
  const height = size === "lg" ? "h-12" : "h-10";
  const appStore = (
    <a
      key="app-store"
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
  );
  const googlePlay = (
    <a
      key="google-play"
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
  );
  return (
    <div className={clsx("flex flex-wrap items-center gap-3", className)}>
      {first === "google-play" ? [googlePlay, appStore] : [appStore, googlePlay]}
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
