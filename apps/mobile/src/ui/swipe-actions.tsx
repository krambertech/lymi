import type { ReactNode } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Icon, Press, Text } from "./primitives";

export interface SwipeAction {
  label: string;
  icon: IconName;
  /** Archive: red, and last. */
  destructive?: boolean;
  onPress: () => void;
}

/**
 * A row that swipes open on its commands from the end edge, as Mail's and Reminders' rows do. The
 * row offers the same commands to VoiceOver itself, since a swipe is never found by ear.
 */
export function SwipeActions({
  actions,
  children,
}: {
  actions: SwipeAction[];
  children: ReactNode;
}) {
  const p = usePalette();
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, swipe) => (
        <View className="flex-row">
          {actions.map((action) => (
            <Press
              key={action.label}
              onPress={() => {
                swipe.close();
                action.onPress();
              }}
              scale={1}
              accessibilityRole="button"
              className={`w-[74px] items-center justify-center gap-1 ${action.destructive ? "bg-danger" : "bg-muted"}`}
            >
              <Icon name={action.icon} size={20} colour={p.plate} />
              <Text className="text-sm font-medium" style={{ color: p.plate }}>
                {action.label}
              </Text>
            </Press>
          ))}
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
