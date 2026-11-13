import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { api, type Settings } from "../lib/api";
import { settingsQuery } from "../lib/queries";
import { InlineError } from "./inline-error";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** Learning emails, on until the learner turns them off here or from an email. */
export function LearningEmailsChoice() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery({ ...settingsQuery, refetchOnMount: "always" });
  const save = useMutation({
    mutationFn: (learningEmails: boolean) => api.updateSettings({ learningEmails }),
    onSuccess: (next) => qc.setQueryData<Settings>(settingsQuery.queryKey, next),
  });
  const on = save.isPending ? save.variables : settings.data?.learningEmails !== false;

  return (
    <div className="grid">
      <div className="edge grid rounded-md bg-plate">
        <Field
          orientation="horizontal"
          disabled={!settings.isSuccess}
          className="relative gap-3 px-4 py-3.5"
        >
          <span
            className="grid size-9 shrink-0 place-items-center self-center rounded-full bg-plate-nested text-ink-secondary"
            aria-hidden="true"
          >
            <Mail className="size-4" />
          </span>
          <FieldContent className="gap-0.5">
            <FieldLabel className="text-base text-ink after:absolute after:inset-0 after:content-['']">
              <Trans>Learning emails</Trans>
            </FieldLabel>
            <FieldDescription>
              {on
                ? t`A few emails when cards are ready and you’ve been away. They can show a card.`
                : t`Off. You’ll only get emails about your account.`}
            </FieldDescription>
          </FieldContent>
          <Switch
            className="self-center"
            checked={on}
            onCheckedChange={(next) => save.mutate(next)}
          />
        </Field>
      </div>
      {save.isError && (
        <InlineError className="mt-2">
          <Trans>Couldn’t save the choice. Check your connection and try again.</Trans>
        </InlineError>
      )}
    </div>
  );
}
