// How an alert's buttons sit in Material's dialog, kept apart from the dialog so it runs in Node.

export type AlertButtonStyle = "default" | "cancel" | "destructive";

/** React Native's alert button, so a call site reads the same on both platforms. */
export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  /** iOS bolds it; Android has no counterpart. */
  isPreferred?: boolean;
  onPress?: () => void;
}

export interface ArrangedButtons {
  /** Material's dismiss slot, at the start of the row: the cancel button, or the first of two. */
  dismiss?: AlertButton;
  /** The rest in the order given; a row holds one, a stack all of them above `dismiss`. */
  confirm: AlertButton[];
  /** Three buttons stack, end-aligned, as Material's do when they cannot share a row. */
  stacked: boolean;
  /** What back or a tap outside runs; undefined when the dialog must be answered. */
  cancel?: AlertButton;
  /** Back and a tap outside close a notice or a question with a cancel button, and nothing else. */
  dismissible: boolean;
}

/** Places an alert's buttons in Material's slots; an alert with none gets one `ok` button, as React Native's does. */
export function arrangeButtons(buttons: AlertButton[], ok: string): ArrangedButtons {
  if (buttons.length === 0) {
    const only = { text: ok };
    return { confirm: [only], stacked: false, cancel: only, dismissible: true };
  }
  const cancel = buttons.find((b) => b.style === "cancel");
  const dismiss = cancel ?? (buttons.length === 2 ? buttons[0] : undefined);
  const confirm = buttons.filter((b) => b !== dismiss);
  return {
    dismiss,
    confirm,
    stacked: buttons.length > 2,
    cancel,
    dismissible: !!cancel,
  };
}

export type ButtonTone = "safe" | "main" | "danger";

/** The safe button is ink and names what stays; the destructive one is red; any other is the accent. overlays.md "Questions". */
export function buttonTone(button: AlertButton): ButtonTone {
  if (button.style === "destructive") return "danger";
  if (button.style === "cancel") return "safe";
  return "main";
}
