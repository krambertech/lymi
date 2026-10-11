import { Tabs } from "expo-router";
import { PillBar } from "../../ui/pill-bar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillBar {...props} />}
      // A tab out of sight stops rendering until it is chosen again, as the web's hidden routes do.
      screenOptions={{ headerShown: false, freezeOnBlur: true }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
