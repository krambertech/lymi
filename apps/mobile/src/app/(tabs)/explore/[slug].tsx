import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Screen } from "../../../ui/screen";

/** A published deck. Until the phone has its own page, it opens the deck on the web. */
export default function ExploreDeck() {
  const { t } = useLingui();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  return (
    <Screen title={name ?? t`Deck`} back={{ label: t`Explore`, to: "/explore" }}>
      <OnTheWeb
        icon="explore"
        title={t`This deck’s page is coming to the phone`}
        line={t`Until then, see its cards and add it on the web.`}
        action={t`Open on the web`}
        path={`/explore/${encodeURIComponent(slug)}`}
      />
    </Screen>
  );
}
