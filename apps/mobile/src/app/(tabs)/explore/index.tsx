import { Trans, useLingui } from "@lingui/react/macro";
import { openBrowserAsync } from "expo-web-browser";
import { Compass } from "lucide-react-native";
import { View } from "react-native";
import { API_URL } from "../../../auth/client";
import { usePalette } from "../../../theme/palette";
import { Button, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";

/** Explore's place in the bar until the phone has its own; until then it opens the web's. */
export default function Explore() {
  const p = usePalette();
  const { t } = useLingui();
  return (
    <Screen title={t`Explore`} kind="tab">
      <View className="items-center gap-5 pt-20">
        <View className="size-16 items-center justify-center rounded-full bg-plate-2">
          <Compass size={28} color={p["text-2"]} strokeWidth={1.75} />
        </View>
        <View className="items-center gap-2">
          <Text className="text-center text-lg font-medium text-text">
            <Trans>Explore is coming to the phone</Trans>
          </Text>
          <Text className="max-w-72 text-center text-base text-text-2">
            <Trans>Until then, find ready decks to add on the web.</Trans>
          </Text>
        </View>
        <Button
          label={t`Open Explore on the web`}
          onPress={() => openBrowserAsync(`${API_URL}/explore`)}
        />
      </View>
    </Screen>
  );
}
