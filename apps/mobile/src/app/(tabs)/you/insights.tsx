import { useLingui } from "@lingui/react/macro";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** The phone's own Insights is #582; until then this page opens the web's. */
export default function Insights() {
  const { t } = useLingui();
  return (
    <Screen title={t`Insights`} back={{ label: t`You`, to: "/you" }}>
      <OnTheWeb
        icon="insights"
        title={t`Insights is coming to the phone`}
        line={t`Until then, see how your memory is doing on the web.`}
        action={t`Open Insights on the web`}
        path="/insights"
      />
    </Screen>
  );
}
