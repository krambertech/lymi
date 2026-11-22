import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { GlassButton } from "./glass";
import type { IconName } from "./icons";
import { Text } from "./primitives";

interface FormHeaderProps {
  close: { label: string; onPress: () => void; icon?: IconName };
  title?: string;
  subtitle?: string | undefined;
  middle?: ReactNode;
  action?: {
    icon: IconName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
  };
  style?: ViewStyle;
}

export function FormHeader({ close, title, subtitle, middle, action, style }: FormHeaderProps) {
  return (
    <View
      collapsable={false}
      className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2"
      style={style}
    >
      <GlassButton icon={close.icon ?? "close"} label={close.label} onPress={close.onPress} />
      <View className="flex-1 items-center">
        {middle ?? (
          <>
            <Text
              className="text-center text-md font-medium text-ink"
              accessibilityRole="header"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-sm text-ink-muted" numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
      {action ? (
        <GlassButton
          icon={action.icon}
          label={action.label}
          primary
          disabled={action.disabled}
          busy={action.busy}
          onPress={action.onPress}
        />
      ) : (
        <View className="size-11" />
      )}
    </View>
  );
}
