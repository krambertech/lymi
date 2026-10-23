import { useLocalSearchParams } from "expo-router";
import { CardListScreen } from "../../../../../deck/card-list-screen";
import { NO_SECTION } from "../../../../../sections/section-line";

export default function Section() {
  const { deck, section } = useLocalSearchParams<{ deck: string; section: string }>();
  return (
    <CardListScreen scope={{ deckId: deck, sectionId: section === NO_SECTION ? "" : section }} />
  );
}
