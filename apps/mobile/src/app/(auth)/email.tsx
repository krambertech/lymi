import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDoor } from "../../auth/door";
import { EmailContent } from "../../auth/door-parts";
import { usePalette } from "../../theme/palette";
import { Icon, Press, Text } from "../../ui/primitives";

/** The email forms on their own screen, top-aligned, so nothing re-centres as a step changes. */
export default function Email() {
  const { t } = useLingui();
  const door = useDoor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  // Leaving by swipe or Back returns the door to its ways in.
  const goTo = useRef(door.goTo);
  goTo.current = door.goTo;
  useEffect(() => () => goTo.current("doors"), []);
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-5"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="h-14 flex-row items-center">
        <Press
          onPress={() => router.back()}
          className="-ms-1.5 h-11 flex-row items-center gap-1 pe-2"
          accessibilityRole="link"
        >
          <Icon name="back" size={20} colour={p.text} />
          <Text className="text-md font-medium text-text-2">{t`Back`}</Text>
        </Press>
      </View>
      <EmailContent door={door} />
    </ScrollView>
  );
}
