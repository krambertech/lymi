import { useLingui } from "@lingui/react/macro";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** The phone's own Activity is #582; until then this page opens the web's. */
export default function Activity() {
  const { t } = useLingui();
  return (
    <Screen title={t`Activity`} back={{ label: t`You`, to: "/you" }}>
      <OnTheWeb
        icon="activity"
        title={t`Activity is coming to the phone`}
        line={t`Until then, see what changed in your Library on the web.`}
        action={t`Open Activity on the web`}
        path="/activity"
      />
    </Screen>
  );
}
