import { useLingui } from "@lingui/react/macro";
import { api, type Settings } from "@lymi/client/api";
import { settingsQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RowFace } from "../ui/row";
import { Switch } from "../ui/switch";

/** Learning emails, on until the learner turns them off here, on the web or from an email. */
export function LearningEmailsSwitch() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const save = useMutation({
    mutationFn: (learningEmails: boolean) => api.updateSettings({ learningEmails }),
    onSuccess: (next) => qc.setQueryData<Settings>(settingsQuery.queryKey, next),
  });
  const on = save.isPending ? save.variables : settings.data?.learningEmails !== false;
  return (
    <RowFace
      icon="email"
      label={t`Learning emails`}
      control={
        <Switch
          checked={!!on}
          disabled={!settings.isSuccess}
          onCheckedChange={(next) => save.mutate(next)}
          accessibilityLabel={t`Learning emails`}
        />
      }
    />
  );
}
