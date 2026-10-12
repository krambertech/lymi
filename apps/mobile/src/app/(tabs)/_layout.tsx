import { useOpenHeldLink } from "../../auth/held-link";
import { TabBar } from "../../ui/tab-bar";

export default function TabsLayout() {
  // A link that arrived while signed out, such as a widget's review, opens now, over Today.
  useOpenHeldLink();
  return <TabBar />;
}
