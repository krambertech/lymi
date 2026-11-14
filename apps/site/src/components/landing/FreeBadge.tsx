import { Trans } from "@lingui/react/macro";
import { Gift } from "lucide-react";

/** Says up front that Lymi costs nothing to start, beside the origin badge when one shows. */
export function FreeBadge() {
  return (
    <p className="edge flex h-8 w-fit items-center gap-2 rounded-full bg-plate ps-2.5 pe-3.5 text-sm font-medium text-ink">
      <Gift aria-hidden="true" className="size-4 shrink-0 text-amber-mark" />
      <Trans>Free, no payment details needed</Trans>
    </p>
  );
}
