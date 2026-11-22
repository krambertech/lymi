export type AlertButtonStyle = "default" | "cancel" | "destructive";

export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  isPreferred?: boolean;
  onPress?: () => void;
}

export interface ArrangedButtons {
  dismiss?: AlertButton;
  confirm: AlertButton[];
  stacked: boolean;
  cancel?: AlertButton;
  dismissible: boolean;
}

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

export function buttonTone(button: AlertButton): ButtonTone {
  if (button.style === "destructive") return "danger";
  if (button.style === "cancel") return "safe";
  return "main";
}
