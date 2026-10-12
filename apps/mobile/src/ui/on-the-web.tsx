import { openBrowserAsync } from "expo-web-browser";
import { View } from "react-native";
import { API_URL } from "../auth/client";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Button, Icon, Text } from "./primitives";

/** Opens a page of the web app in the in-app browser: the setup jobs, and places the phone lacks. ADR 0030. */
export function openWeb(path: string) {
  return openBrowserAsync(`${API_URL}${path}`);
}

interface Props {
  icon: IconName;
  title: string;
  line: string;
  action: string;
  /** The web app's page, such as `/insights`. */
  path: string;
}

/** A place the phone does not have yet: what it is, and a way to it on the web. */
export function OnTheWeb({ icon, title, line, action, path }: Props) {
  const p = usePalette();
  return (
    <View className="items-center gap-5 pt-20">
      <View className="size-16 items-center justify-center rounded-full bg-plate-2">
        <Icon name={icon} size={28} colour={p["text-2"]} strokeWidth={1.75} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-lg font-medium text-text">{title}</Text>
        <Text className="max-w-72 text-center text-base text-text-2">{line}</Text>
      </View>
      <Button label={action} onPress={() => openWeb(path)} />
    </View>
  );
}
