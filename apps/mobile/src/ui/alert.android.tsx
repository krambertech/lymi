import {
  AlertDialog,
  Column,
  Host,
  Text,
  TextButton,
  type TextProps,
} from "@expo/ui/jetpack-compose";
import { verticalScroll } from "@expo/ui/jetpack-compose/modifiers";
import { useLingui } from "@lingui/react/macro";
import { useSyncExternalStore } from "react";
import { usePalette, useRoom } from "../theme/palette";
import { type AlertButton, arrangeButtons, type ButtonTone, buttonTone } from "./alert-buttons";
import { afterWindowFocus } from "./window-focus";

export type { AlertButton } from "./alert-buttons";

interface Shown {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let queue: Shown[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function alert(title: string, message?: string, buttons: AlertButton[] = []) {
  queue = [...queue, { id: nextId++, title, message, buttons }];
  emit();
}

type TextStyle = NonNullable<TextProps["style"]>;

const TITLE: TextStyle = { fontFamily: "Onest", fontSize: 22, lineHeight: 28 };
const BODY: TextStyle = { fontFamily: "Onest", fontSize: 15, lineHeight: 21 };
const LABEL: TextStyle = { fontFamily: "Onest", fontSize: 15, lineHeight: 20 };

export function AlertHost() {
  const { t } = useLingui();
  const p = usePalette();
  const room = useRoom();
  const shown = useSyncExternalStore(subscribe, () => queue[0]);
  if (!shown) return null;

  const { dismiss, confirm, stacked, cancel, dismissible } = arrangeButtons(shown.buttons, t`OK`);
  const tones: Record<ButtonTone, string> = {
    safe: p.ink,
    main: p["amber-text"],
    danger: p.danger,
  };
  const choose = (button: AlertButton | undefined) => {
    if (queue[0]?.id !== shown.id) return;
    queue = queue.filter((a) => a.id !== shown.id);
    emit();
    const run = button?.onPress;
    if (run) afterWindowFocus(run);
  };
  const button = (b: AlertButton, at: number) => (
    <TextButton key={at} onClick={() => choose(b)} colors={{ contentColor: tones[buttonTone(b)] }}>
      <Text color={tones[buttonTone(b)]} style={LABEL}>
        {b.text}
      </Text>
    </TextButton>
  );
  const all = dismiss ? [...confirm, dismiss] : confirm;

  return (
    <Host colorScheme={room} matchContents style={{ position: "absolute" }}>
      <AlertDialog
        key={shown.id}
        onDismissRequest={() => dismissible && choose(cancel)}
        colors={{
          containerColor: p.plate,
          titleContentColor: p.ink,
          textContentColor: p["ink-secondary"],
        }}
        properties={{ dismissOnBackPress: dismissible, dismissOnClickOutside: dismissible }}
      >
        <AlertDialog.Title>
          <Text color={p.ink} style={TITLE}>
            {shown.title}
          </Text>
        </AlertDialog.Title>
        {shown.message ? (
          <AlertDialog.Text>
            <Text color={p["ink-secondary"]} style={BODY} modifiers={[verticalScroll()]}>
              {shown.message}
            </Text>
          </AlertDialog.Text>
        ) : null}
        {dismiss && !stacked ? (
          <AlertDialog.DismissButton>{button(dismiss, 0)}</AlertDialog.DismissButton>
        ) : null}
        <AlertDialog.ConfirmButton>
          {stacked ? (
            <Column horizontalAlignment="end">{all.map(button)}</Column>
          ) : (
            confirm.map(button)
          )}
        </AlertDialog.ConfirmButton>
      </AlertDialog>
    </Host>
  );
}
