import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { PAGES } from "../../design/registry";
import { Text } from "../../ui/primitives";
import { Screen } from "../../ui/screen";

export default function DesignPageScreen() {
  const { page: slug } = useLocalSearchParams<{ page: string }>();
  const page = PAGES.find((p) => p.slug === slug);
  if (!page)
    return (
      <Screen title="Not found" back={{ label: "Design system", to: "/design" }}>
        {null}
      </Screen>
    );
  const { Page } = page;
  return (
    <Screen title={page.title} back={{ label: "Design system", to: "/design" }}>
      <View className="-mt-4 gap-2">
        <Text className="text-md text-text-2">{page.lede}</Text>
        <Text className="text-xs text-muted" style={{ fontFamily: "Menlo", letterSpacing: 0 }}>
          docs/design/system/{page.doc}
        </Text>
      </View>
      <Page />
    </Screen>
  );
}
