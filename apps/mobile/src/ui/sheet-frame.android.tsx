import {
  Host,
  // oxlint-disable-next-line eslint/no-restricted-imports -- this is the one place the raw sheet is wrapped.
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

export function SheetFrame({ open, onOpenChange, onDismiss, expands, children }: SheetFrameProps) {
  const p = usePalette();
  const room = useRoom();
  const { width } = useWindowDimensions();
  const ref = useRef<ModalBottomSheetRef>(null);
  const [shown, setShown] = useState(open);
  const [mount, setMount] = useState(0);
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
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a change of `open` moves the sheet.
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
  // oxlint-disable react-hooks/exhaustive-deps -- it answers the sheet going, not a new onDismiss.
  useEffect(() => {
    if (shown || !left.current) return;
    left.current = false;
    return afterWindowFocus(onDismiss);
  }, [shown]);
  // oxlint-enable react-hooks/exhaustive-deps
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
        showDragHandle={false}
      >
        <RNHostView matchContents={!expands}>
          <View style={expands ? { flexGrow: 1, height: 0 } : { width }}>
            {children}
            <Grabber />
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
