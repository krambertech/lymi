import { useLingui } from "@lingui/react/macro";
import { api, refusalCode } from "@lymi/client/api";
import { useMutation } from "@tanstack/react-query";
import { FieldError } from "../ui/field";
import { Text } from "../ui/primitives";

/** Asks for the emailed code. A code still on its way counts as sent, so its sheet opens again. */
export function useSendCode({ onSent }: { onSent: (sentTo: string | null) => void }) {
  const { t } = useLingui();
  const send = useMutation({
    mutationFn: api.sendDeletionCode,
    onSuccess: (data) => onSent(data.sentTo),
    onError: (error) => {
      if (refusalCode(error) === "code_sent") onSent(null);
    },
  });
  const error = (() => {
    if (!send.isError) return null;
    switch (refusalCode(send.error)) {
      case "code_sent":
        return null;
      case "publisher":
        return t`This is a Lymi publisher account. It publishes the decks in Explore, so it can’t be deleted here. Write to hello@lymi.app to delete it.`;
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
  return <FieldError>{children}</FieldError>;
}

export function AppleNote() {
  const { t } = useLingui();
  return (
    <Text className="px-1 text-base text-muted">
      {t`You sign in with Apple, so once the account is deleted, also remove Lymi under Sign in with Apple in your Apple Account settings.`}
    </Text>
  );
}
