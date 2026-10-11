import { dropQueued } from "@lymi/client/queued";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { Uniwind } from "uniwind";
import { authClient, useSession } from "../../../auth/client";
import { useResetDemo } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";

export default function You() {
  const reset = useResetDemo();
  const p = usePalette();
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [signingOut, setSigningOut] = useState(false);
  const user = useSession().data?.user;
  const queryClient = useQueryClient();
  return (
    <Screen title="You">
      <Plate className="flex-row items-center gap-4 p-4">
        <View className="size-14 items-center justify-center rounded-full border border-edge bg-plate-2">
          <Text className="text-xl font-medium text-text-2">
            {user?.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-medium text-text" numberOfLines={1}>
            {user?.name}
          </Text>
          <Text className="text-base text-muted" numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </Plate>

      <View className="gap-2">
        <SectionTitle>Theme</SectionTitle>
        <Segmented
          label="Theme"
          value={theme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => {
            setTheme(v);
            Uniwind.setTheme(v);
          }}
        />
      </View>

      <View>
        <SectionTitle>On the Home Screen</SectionTitle>
        <Plate className="flex-row gap-3 p-4">
          <Icon name="widgets" size={20} colour={p["text-2"]} />
          <Text className="flex-1 text-base text-text-2">
            Touch and hold the Home Screen, tap Edit, then Add Widget and pick Lymi. The Lock Screen
            has a lantern too.
          </Text>
        </Plate>
      </View>

      <Button label="Start today again" icon="reset" onPress={reset} />

      <Button
        label="Sign out"
        icon="signOut"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          // The stored session is cleared before the request, so an unreachable Worker still signs out.
          await authClient.signOut().catch(() => undefined);
          // Nothing of this learner stays on the device for the next one, as on the web.
          dropQueued();
          queryClient.clear();
          setSigningOut(false);
        }}
      />
    </Screen>
  );
}
