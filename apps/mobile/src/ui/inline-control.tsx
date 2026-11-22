import type { ReactNode } from "react";
import { View } from "react-native";

const WORD_JOINER = String.fromCharCode(0x2060);
const ROOM = 8;

export const INLINE_ROOM = { paddingVertical: ROOM, marginVertical: -ROOM } as const;

export function InlineControl({ lift = 0, children }: { lift?: number; children: ReactNode }) {
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
