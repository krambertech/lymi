import { Trans } from "@lingui/react/macro";
import { RotateCcw } from "lucide-react";
import { buttonClass } from "../Button";

interface Props {
  /** The demo has finished, so replaying means something. */
  shown: boolean;
  onReplay: () => void;
  className?: string | undefined;
}

/** Held in place while its demo plays, so appearing never moves the page. */
export function ReplayButton({ shown, onReplay, className }: Props) {
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      className={buttonClass(
        "ghost",
        "sm",
        `transition-opacity duration-300 ${shown ? "opacity-100" : "pointer-events-none opacity-0"} ${className ?? ""}`,
      )}
    >
      <RotateCcw aria-hidden="true" />
      <Trans>Play again</Trans>
    </button>
  );
}
