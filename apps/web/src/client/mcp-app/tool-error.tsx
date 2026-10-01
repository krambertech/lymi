import { Trans } from "@lingui/react/macro";
import { InlineError } from "../components/inline-error";
import { ViewFrame } from "./view-frame";

/** The assistant reads the same message; the view only shows it where the result would be. */
export function ToolError({ message }: { message: string | null }) {
  return (
    <ViewFrame title="Lymi">
      <InlineError className="text-sm">
        {message ?? <Trans>Couldn’t finish this. Try again in a moment.</Trans>}
      </InlineError>
    </ViewFrame>
  );
}
