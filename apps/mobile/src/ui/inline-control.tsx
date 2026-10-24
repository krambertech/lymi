import type { ReactNode } from "react";
import { View } from "react-native";

/** Keeps a control on the same line as the last word. */
const WORD_JOINER = String.fromCharCode(0x2060);
/** iOS cuts an inline view off at its text's edge, and a 32 pt button stands taller than its line. */
const ROOM = 8;

/** Room a line gives a control past its edges, given back so the layout never moves. */
export const INLINE_ROOM = { paddingVertical: ROOM, marginVertical: -ROOM } as const;

/**
 * A 32 pt control inside a line of plain text, after its last word; the `Text` it sits in takes
 * `INLINE_ROOM`. iOS centres it on a reading-size line, and `lift` moves it on a larger one.
 */
export function InlineControl({ lift = 0, children }: { lift?: number; children: ReactNode }) {
  return (
    <>
      {WORD_JOINER}
      <View
        style={{
          // Room for the button's own -8 pt margins, so the text does not clip it.
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

/** The same control beside the last run of text drawn with readings, centred on that run's line. */
export function RunControl({ line, children }: { line: number; children: ReactNode }) {
  return (
    <View style={{ height: line, justifyContent: "center", paddingStart: 12 }}>{children}</View>
  );
}
