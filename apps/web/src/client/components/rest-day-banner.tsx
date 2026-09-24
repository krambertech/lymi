import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { IconButton } from "./button";
import { RestGlyph } from "./streak-calendar";

interface Props {
  /** The run that carried on through yesterday. */
  current: number;
  onDismiss?: (() => void) | undefined;
  className?: string | undefined;
}

/** Today's one mention of a rest day, the morning after. It never counts or warns. */
export function RestDayBanner({ current, onDismiss, className }: Props) {
  const { t } = useLingui();
  return (
    <div
      className={clsx(
        "enter-fade flex items-center gap-4 rounded-xl bg-plate-2 py-3.5 ps-5 pe-3 @3xl:ps-6",
        className,
      )}
    >
      <RestGlyph />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-md font-medium text-text">
          <Trans>Yesterday was a rest day</Trans>
        </p>
        <p className="text-sm text-text-2">
          <Plural
            value={current}
            one="Your #-day streak carries on."
            other="Your #-day streak carries on."
          />
        </p>
      </div>
      {onDismiss && (
        <IconButton label={t`Dismiss`} size="sm" onClick={onDismiss}>
          <X aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
