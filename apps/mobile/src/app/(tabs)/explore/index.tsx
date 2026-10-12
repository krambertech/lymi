import { useLingui } from "@lingui/react/macro";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** Explore's place in the bar until the phone has its own; until then it opens the web's. */
export default function Explore() {
  const { t } = useLingui();
  return (
    <Screen title={t`Explore`} kind="tab">
      <OnTheWeb
        icon="explore"
        title={t`Explore is coming to the phone`}
        line={t`Until then, find ready decks to add on the web.`}
        action={t`Open Explore on the web`}
        path="/explore"
      />
    </Screen>
  );
}
