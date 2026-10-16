import { useLocalSearchParams } from "expo-router";
import { ImportScreen } from "../../import/import-screen";

/** `/import/<id>`, as on the web: one import from its upload to its end. */
export default function Import() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ImportScreen id={id} />;
}
