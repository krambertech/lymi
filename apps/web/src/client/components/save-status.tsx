import { Trans, useLingui } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { InlineError } from "./inline-error";

interface Props {
  saving?: boolean | undefined;
  /** True for a few seconds after a save lands. */
  saved?: boolean | undefined;
  error?: string | undefined;
}

/** A settings screen's line beside its title: Saving…, then Saved with a check, or the error. */
export function SaveStatus({ saving, saved, error }: Props) {
  const { t } = useLingui();
  return (
    <p className="min-h-5 text-sm text-muted" role="status">
      {error ? (
        <InlineError>{error}</InlineError>
      ) : saving ? (
        t`Saving…`
      ) : saved ? (
        <span className="enter-fade inline-flex items-center gap-1.5">
          <Check className="size-4" aria-hidden="true" />
          <Trans>Saved</Trans>
        </span>
      ) : null}
    </p>
  );
}
