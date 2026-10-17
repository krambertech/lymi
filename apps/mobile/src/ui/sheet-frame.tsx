// biome-ignore lint/style/noRestrictedImports: this is the one place the raw sheet is wrapped.
import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import type { ReactElement } from "react";
import { useRoom } from "../theme/palette";

export interface SheetFrameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
  /** Opens at `peek` and drags up to the full screen, rather than sizing to what it holds. */
  expands: boolean;
  peek: number | null;
  children: ReactElement;
}

/** The sheet itself, presented by iOS in Liquid Glass; sheet-frame.android.tsx is Android's. */
export function SheetFrame({
  open,
  onOpenChange,
  onDismiss,
  expands,
  peek,
  children,
}: SheetFrameProps) {
  const room = useRoom();
  const detents = expands && peek ? [presentationDetents([{ height: peek }, "large"])] : [];
  return (
    <Host colorScheme={room} style={{ position: "absolute", width: 0, height: 0 }}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={onOpenChange}
        onDismiss={onDismiss}
        fitToContents={!expands}
      >
        <Group modifiers={[presentationDragIndicator("visible"), ...detents]}>
          <RNHostView matchContents={!expands}>{children}</RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}
