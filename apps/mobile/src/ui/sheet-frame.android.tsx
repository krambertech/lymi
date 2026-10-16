import {
  Host,
  // biome-ignore lint/style/noRestrictedImports: this is the one place the raw sheet is wrapped.
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { useEffect, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { usePalette, useRoom } from "../theme/palette";
import { Grabber } from "./grabber";
import type { SheetFrameProps } from "./sheet-frame";
import { afterWindowFocus } from "./window-focus";

/** Android's sheet: Material's modal bottom sheet in the room's colours, mounted only while shown and slid away before it goes. */
export function SheetFrame({ open, onOpenChange, onDismiss, expands, children }: SheetFrameProps) {
  const p = usePalette();
  const room = useRoom();
  const { width } = useWindowDimensions();
  const ref = useRef<ModalBottomSheetRef>(null);
  const [shown, setShown] = useState(open);
  // A new sheet each time it reopens while still sliding away, since a hidden sheet does not rise again.
  const [mount, setMount] = useState(0);
  // A slide the app started and a swipe can both end the sheet; only the first one counts.
  const live = useRef(open);
  const left = useRef(false);
  const closing = useRef(0);
  const sliding = useRef(false);
  const gone = () => {
    if (!live.current) return;
    live.current = false;
    left.current = true;
    setShown(false);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a change of `open` moves the sheet.
  useEffect(() => {
    const id = ++closing.current;
    if (!open) {
      if (!live.current) return;
      const finish = () => {
        sliding.current = false;
        if (closing.current === id) gone();
      };
      const sheet = ref.current;
      sliding.current = !!sheet;
      if (sheet) void sheet.hide().then(finish, finish);
      else finish();
      return;
    }
    if (sliding.current) setMount((m) => m + 1);
    live.current = true;
    setShown(true);
  }, [open]);
  // What a row chose runs once the screen's window has focus back from the sheet's, or a field it
  // focuses gets no keyboard.
  // biome-ignore lint/correctness/useExhaustiveDependencies: it answers the sheet going, not a new onDismiss.
  useEffect(() => {
    if (shown || !left.current) return;
    left.current = false;
    return afterWindowFocus(onDismiss);
  }, [shown]);
  if (!shown) return null;
  return (
    <Host colorScheme={room} style={{ position: "absolute", width }} pointerEvents="none">
      <ModalBottomSheet
        key={mount}
        ref={ref}
        onDismissRequest={() => {
          onOpenChange(false);
          gone();
        }}
        skipPartiallyExpanded={!expands}
        containerColor={p.sheet}
        scrimColor={p.scrim}
        // Material's handle takes its own 48 dp row above the sheet's padding; Lymi's floats over it, as iOS's does.
        showDragHandle={false}
      >
        <RNHostView matchContents={!expands}>
          {/* Sized to what it holds, or filling the sheet so a long one scrolls to its end. */}
          <View style={expands ? { flexGrow: 1, height: 0 } : { width }}>
            {children}
            <Grabber />
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
