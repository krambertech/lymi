import { useLingui } from "@lingui/react/macro";
import { ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "../../views/shell";
import { IconButton } from "../button";
import { usePlaceShape } from "../ui/dialog";

interface Props {
  /** Where the place belongs, such as a word's deck. */
  label?: string | undefined;
  /** The screen under the place, which back names on a phone. The label, unless it is given. */
  returnsTo?: string | undefined;
  /** The place's own controls, at the end. */
  actions?: ReactNode | undefined;
  /** A short line such as Saved, before the controls. */
  status?: ReactNode | undefined;
  onClose?: (() => void) | undefined;
  /** An inner view's way back, which takes the place of close. `name` is the icon's accessible name on a desktop. */
  back?: { label: string; onClick: () => void; name?: string | undefined } | undefined;
}

/**
 * The first line of a place. Over the whole screen it is a page's bar and leaving is back, named
 * for the screen under it; in a sheet, a dialog or beside a list it is one compact row that ends in close.
 */
export function PlaceBar({ label, returnsTo, actions, status, onClose, back }: Props) {
  const { t } = useLingui();
  const shape = usePlaceShape();

  if (shape === "screen") {
    return (
      <header className="-mt-1 -mb-1 flex h-14 items-center gap-2">
        {back ? (
          <BackButton label={back.label} onClick={back.onClick} />
        ) : (
          onClose && <BackButton label={returnsTo ?? label ?? ""} onClick={onClose} />
        )}
        <div className="ms-auto flex shrink-0 items-center gap-1">
          {status}
          {actions}
        </div>
      </header>
    );
  }

  return (
    <header className="flex min-h-10 items-center gap-1">
      {back && (
        <IconButton
          label={back.name ?? back.label}
          size="sm"
          onClick={back.onClick}
          className="-ms-2"
        >
          <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
        </IconButton>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{label}</span>
      {status}
      {actions}
      {onClose && (
        // Pulled out by the button's padding and the glyph's own 4 px inset, so the X ends on the content edge.
        <IconButton label={t`Close`} size="sm" onClick={onClose} className="-me-3">
          <X aria-hidden="true" />
        </IconButton>
      )}
    </header>
  );
}
