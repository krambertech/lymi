import { useLocalSearchParams } from "expo-router";
import { CardListScreen } from "../../../deck/card-list-screen";

export default function Deck() {
  const { deck } = useLocalSearchParams<{ deck: string }>();
  return <CardListScreen scope={{ deckId: deck }} />;
}
