import { type ReactNode, useState } from "react";
import { Platform, View } from "react-native";
import { ScopedTheme } from "uniwind";
import { type Room, useRoom } from "../theme/palette";
import { IconButton, Text } from "../ui/primitives";

// The design screen's own parts, as the web's design/frame.tsx: a page, its sections, and a canvas
// that shows one component's states, each on a labelled row, in either room.

/** Annotations are set in mono, so a note about a component never reads as part of it. */
export const MONO = {
  // Menlo is Apple's; Android's own monospace stands in for it.
  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  letterSpacing: 0,
} as const;

/** One section of a page: a component, what it is for, and where it lives. */
export function Sub({
  title,
  note,
  source,
  children,
}: {
  title: string;
  note?: string;
  /** The component's file under `apps/mobile/src`. */
  source?: string;
  children?: ReactNode;
}) {
  return (
    <View className="gap-4 border-t border-edge pt-7">
      <View className="gap-1.5">
        <Text className="text-lg font-medium text-ink" accessibilityRole="header">
          {title}
        </Text>
        {note && <Text className="text-base text-ink-muted">{note}</Text>}
        {source && (
          <Text className="text-xs text-ink-muted" style={MONO}>
            {source}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

export interface Variant {
  label: string;
  /** What this state is for, in one sentence. */
  note?: string;
  render: (room: Room) => ReactNode;
}

/**
 * A component's states on one canvas, a labelled row each: the label and its note above, the thing
 * itself under them. The canvas follows the phone's room until its own switch picks the other.
 */
export function Variants({ items }: { items: Variant[] }) {
  const system = useRoom();
  const [picked, setPicked] = useState<Room | null>(null);
  const room = picked ?? system;
  return (
    <ScopedTheme theme={room}>
      <Canvas>
        <View className="absolute end-1.5 top-1.5 z-10">
          <IconButton
            icon={room === "dark" ? "moon" : "sun"}
            label={room === "dark" ? "Show in the light room" : "Show in the dark room"}
            size="sm"
            onPress={() => {
              const next = room === "dark" ? "light" : "dark";
              setPicked(next === system ? null : next);
            }}
          />
        </View>
        {items.map((v, i) => (
          <View key={v.label} className={`gap-3 px-4 py-4 ${i > 0 ? "border-t border-edge" : ""}`}>
            <View className={`gap-1 ${i === 0 ? "pe-10" : ""}`}>
              <Text className="text-xs font-semibold text-ink" style={MONO}>
                {v.label}
              </Text>
              {v.note && (
                <Text className="text-xs text-ink-muted" style={[MONO, { lineHeight: 17 }]}>
                  {v.note}
                </Text>
              )}
            </View>
            <View>{v.render(room)}</View>
          </View>
        ))}
      </Canvas>
    </ScopedTheme>
  );
}

/** The room's own ground, edged, for a canvas or a picture of a token. */
function Canvas({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-lg border border-edge bg-canvas">{children}</View>
  );
}

/** Things laid out in equal columns, two to a row, so states line up under each other. */
export function Grid({ children }: { children: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % 2 === 0) rows.push([]);
    rows.at(-1)?.push(child);
  });
  return (
    <View className="gap-2">
      {rows.map((row, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows never reorder
        <View key={r} className="flex-row gap-2">
          {row.map((cell, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: cells never reorder
            <View key={c} className="flex-1">
              {cell}
            </View>
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

/** A row that lays its things out the way a screen would: wrapped, centred, 8 pt apart. */
export function Row({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}
