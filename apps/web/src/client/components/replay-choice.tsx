import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MousePointerClick } from "lucide-react";
import { api, type Settings } from "../lib/api";
import { settingsQuery } from "../lib/queries";
import { InlineError } from "./inline-error";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** Session replay on the web, on until the learner turns it off. docs/analytics.md. */
export function ReplayChoice() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery({ ...settingsQuery, refetchOnMount: "always" });
  const save = useMutation({
    mutationFn: (sessionReplay: boolean) => api.updateSettings({ sessionReplay }),
    onSuccess: (next) => qc.setQueryData<Settings>(settingsQuery.queryKey, next),
  });
  const on = save.isPending ? save.variables : settings.data?.sessionReplay !== false;

  return (
    <div className="grid">
      <div className="edge grid rounded-md bg-plate">
        <Field
          orientation="horizontal"
          disabled={!settings.isSuccess}
          className="relative gap-3 px-4 py-3.5"
        >
          <span
            className="grid size-9 shrink-0 place-items-center self-center rounded-full bg-plate-2 text-text-2"
            aria-hidden="true"
          >
            <MousePointerClick className="size-4" />
          </span>
          <FieldContent className="gap-0.5">
            <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
              <Trans>Help improve Lymi</Trans>
            </FieldLabel>
            <FieldDescription>
              {on
                ? t`Lets us see where Lymi is hard to use by replaying how you move through it. Your cards, names and typing stay hidden.`
                : t`Off. We don’t replay how you use Lymi.`}
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
