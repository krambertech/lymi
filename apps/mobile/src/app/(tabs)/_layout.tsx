import { Tabs, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";
import { useStore } from "../../data/store";
import { palette } from "../../theme/tokens.gen";
import { useFontFamily } from "../../ui/font";
import { PillBar } from "../../ui/pill-bar";
import { ReviewAccessory } from "../../ui/review-accessory";

export default function TabsLayout() {
  const { directions, due } = useStore();
  const onToday = usePathname().startsWith("/today");
  const labelFont = useFontFamily(false);

  if (directions.chrome !== "native") {
    return (
      <Tabs
        key="pill"
        tabBar={(props) => <PillBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="you" />
      </Tabs>
    );
  }

  // The glass takes its tint from what scrolls under it; only the selected item wears the ink.
  // Icons are Lucide, as on the web, rendered to template images by scripts/tab-icons.mjs.
  const ink = DynamicColorIOS({ light: palette.light.text, dark: palette.dark.text });
  return (
    <NativeTabs
      key="native"
      tintColor={ink}
      labelStyle={{ fontFamily: labelFont, fontWeight: "500" }}
      minimizeBehavior="onScrollDown"
    >
      {/* Today already leads with Review; elsewhere it rides above the tabs. */}
      {!onToday && due.length > 0 && (
        <NativeTabs.BottomAccessory>
          <ReviewAccessory />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("../../../assets/tabs/today.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("../../../assets/tabs/library.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("../../../assets/tabs/you.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
