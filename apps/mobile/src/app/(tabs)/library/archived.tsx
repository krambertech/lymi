import { useLingui } from "@lingui/react/macro";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** The phone's own Archived is #581; until then this page opens the web's. */
export default function Archived() {
  const { t } = useLingui();
  return (
    <Screen title={t`Archived`} back={{ label: t`Library`, to: "/library" }}>
      <OnTheWeb
        icon="archive"
        title={t`Archived is coming to the phone`}
        line={t`Until then, restore archived cards on the web.`}
        action={t`Open Archived on the web`}
        path="/archived"
      />
    </Screen>
  );
}
