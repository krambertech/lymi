import { useLingui } from "@lingui/react/macro";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** The phone's own Settings is #587; until then this page opens the web's. */
export default function Settings() {
  const { t } = useLingui();
  return (
    <Screen title={t`Settings`} back={{ label: t`You`, to: "/you" }}>
      <OnTheWeb
        icon="settings"
        title={t`Settings is coming to the phone`}
        line={t`Until then, change your settings on the web.`}
        action={t`Open Settings on the web`}
        path="/settings"
      />
    </Screen>
  );
}
