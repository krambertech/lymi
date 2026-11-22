import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./primitives";

const WORD_JOINER = String.fromCharCode(0x2060);
const ROOM = 8;

const INLINE_ROOM = { paddingVertical: ROOM, marginVertical: -ROOM } as const;

interface TextWithControlProps extends Omit<ComponentProps<typeof Text>, "children"> {
  control: ReactNode;
  lift: number;
  children: string;
}

export function TextWithControl({
  control,
  lift,
  style,
  children,
  ...props
}: TextWithControlProps) {
  return (
    <Text {...props} style={[style, control ? INLINE_ROOM : null]}>
      {children}
      {control ? <InlineControl lift={lift}>{control}</InlineControl> : null}
    </Text>
  );
}

function InlineControl({ lift, children }: { lift: number; children: ReactNode }) {
  return (
    <>
      {WORD_JOINER}
      <View
        style={{
          paddingVertical: ROOM,
          paddingStart: 12,
          transform: [{ translateY: lift }],
        }}
      >
        {children}
      </View>
    </>
  );
}

export function RunControl({ line, children }: { line: number; children: ReactNode }) {
  return (
    <View style={{ height: line, justifyContent: "center", paddingStart: 12 }}>{children}</View>
  );
}
