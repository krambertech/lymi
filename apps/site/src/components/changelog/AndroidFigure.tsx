import { Trans } from "@lingui/react/macro";
import { GooglePlayMark } from "../GetTheApp";

/** Lymi's Google Play listing as a plate: the icon, the store name and short description. */
export function AndroidFigure() {
  return (
    <div aria-hidden="true" className="flex w-[460px] justify-center py-8">
      <div className="flex w-[400px] items-center gap-5 rounded-xl bg-plate p-5 edge-drop">
        <img
          src="/phone/icon.png"
          alt=""
          width={96}
          height={96}
          // The changelog frame places images absolutely; this one sits in its plate.
          className="relative! size-24 shrink-0 rounded-[22px]"
        />
        <div className="min-w-0">
          <p className="text-xl font-medium tracking-[-0.01em] text-ink">
            <Trans>Lymi: Flashcards</Trans>
          </p>
          <p className="mt-1 text-sm text-pretty text-ink-secondary">
            <Trans>
              Flashcards for concepts, facts and vocabulary. Learn with spaced repetition.
            </Trans>
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-plate-nested px-2.5 py-1 text-sm font-medium text-ink">
            <GooglePlayMark />
            Google Play
          </p>
        </div>
      </div>
    </div>
  );
}
