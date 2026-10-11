import { Tabs } from "expo-router";
import { PillBar } from "../../ui/pill-bar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <PillBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="today" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
