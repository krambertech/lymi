import { useLingui } from "@lingui/react/macro";
import { api, refusalCode } from "@lymi/client/api";
import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "../ui/primitives";

/** Asks for the emailed code. A code still on its way counts as sent, so its sheet opens again. */
export function useSendCode({
  onSent,
  onPublisher,
}: {
  onSent: (sentTo: string | null) => void;
  onPublisher?: () => void;
}) {
  const { t } = useLingui();
  const send = useMutation({
    mutationFn: api.sendDeletionCode,
    onSuccess: (data) => onSent(data.sentTo),
    onError: (error) => {
      const reason = refusalCode(error);
      if (reason === "code_sent") onSent(null);
      if (reason === "publisher") onPublisher?.();
    },
  });
  const error = (() => {
    if (!send.isError) return null;
    switch (refusalCode(send.error)) {
      case "code_sent":
      case "publisher":
        return null;
      case "code_limit":
        return t`You’ve asked for several codes today. Try again tomorrow.`;
      default:
        return t`Couldn’t send the code. Check your connection and try again.`;
    }
  })();
  return {
    send: () => {
      if (!send.isPending) send.mutate();
    },
    pending: send.isPending,
    error,
  };
}

export function ErrorLine({ children }: { children: string | null }) {
  const p = usePalette();
  if (!children) return null;
  return (
    <View className="flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
      <Icon name="alert" size={14} colour={p.danger} />
      <Text className="flex-1 text-base text-danger">{children}</Text>
    </View>
  );
}

export function AppleNote() {
  const { t } = useLingui();
  return (
    <Text className="px-1 text-base text-muted">
      {t`You sign in with Apple, so once the account is deleted, also remove Lymi under Sign in with Apple in your Apple Account settings.`}
    </Text>
  );
}
