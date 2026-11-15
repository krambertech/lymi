import { type Href, useRouter } from "expo-router";
import { View } from "react-native";
import { COMPONENTS, type DesignPage, FOUNDATIONS } from "../../design/registry";
import { Plate, Press, RowArrow, SectionTitle, Text } from "../../ui/primitives";
import { Screen } from "../../ui/screen";

// The phone’s design system, as the web’s /design: foundations, then each component in every
// state. For people building Lymi, so its text is not translated.

export default function DesignIndex() {
  return (
    <Screen title="Design system">
      <Text className="-mt-4 text-md text-ink-secondary">
        The phone’s components under the web’s names, each in every state and both rooms. The rules
        are in docs/design/system; phone.md has where the phone differs.
      </Text>
      <Group title="Foundations" pages={FOUNDATIONS} />
      <Group title="Components" pages={COMPONENTS} />
    </Screen>
  );
}

function Group({ title, pages }: { title: string; pages: DesignPage[] }) {
  const router = useRouter();
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <Plate className="overflow-hidden">
        {pages.map((page, i) => (
          <Press
            key={page.slug}
            scale={0.98}
            onPress={() => router.push(`/design/${page.slug}` as Href)}
            accessibilityRole="link"
            className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-md font-medium text-ink">{page.title}</Text>
              <Text className="text-base text-ink-muted">{page.summary}</Text>
            </View>
            <RowArrow />
          </Press>
        ))}
      </Plate>
    </View>
  );
}
