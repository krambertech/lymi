import { Trans, useLingui } from "@lingui/react/macro";
import { ANALYTICS_CONSENT_VERSION } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartNoAxesColumn } from "lucide-react";
import { api, type Settings } from "../lib/api";
import { publicSiteUrl } from "../lib/origins";
import { settingsQuery } from "../lib/queries";
import { InlineError } from "./inline-error";
import { SettingsGroup } from "./settings-group";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** Product analytics are on for every account; this is where a learner turns them off. */
export function AnalyticsSection() {
  const { t, i18n } = useLingui();
  const settings = useQuery(settingsQuery);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (allowed: boolean) =>
      api.updateAnalyticsConsent({
        allowed,
        version: ANALYTICS_CONSENT_VERSION,
        updated_at: Date.now(),
      }),
    onMutate: async (allowed) => {
      await qc.cancelQueries({ queryKey: settingsQuery.queryKey });
      const previous = qc.getQueryData<Settings>(settingsQuery.queryKey);
      if (previous)
        qc.setQueryData<Settings>(settingsQuery.queryKey, {
          ...previous,
          analyticsConsent: allowed,
        });
      return { previous };
    },
    onError: (_error, _allowed, context) => {
      if (context?.previous) qc.setQueryData(settingsQuery.queryKey, context.previous);
    },
    onSuccess: (value) => qc.setQueryData(settingsQuery.queryKey, value),
  });
  const on = settings.data?.analyticsConsent !== false;
  const policy = publicSiteUrl(`${i18n.locale === "en" ? "" : `/${i18n.locale}`}/privacy`);

  return (
    <SettingsGroup title={t`Privacy`}>
      <div className="edge grid rounded-md bg-plate">
        <Field
          orientation="horizontal"
          disabled={!settings.isSuccess || save.isPending}
          className="relative gap-3 px-4 py-3.5"
        >
          <span
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-plate-2 text-text-2"
            aria-hidden="true"
          >
            <ChartNoAxesColumn className="size-4" />
          </span>
          <FieldContent className="gap-0.5">
            <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
              <Trans>Product analytics</Trans>
            </FieldLabel>
            <FieldDescription>
              <Trans>
                Lets us see which parts of Lymi you use, such as reviews and cards added. Never what
                your cards say.
              </Trans>
            </FieldDescription>
          </FieldContent>
          <span className="flex h-lh shrink-0 items-center text-base">
            <Switch checked={on} onCheckedChange={(next) => save.mutate(next)} />
          </span>
        </Field>
      </div>
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        {save.isError ? (
          <p role="alert">
            <InlineError>
              <Trans>Couldn’t save your analytics choice. Try again.</Trans>
            </InlineError>
          </p>
        ) : (
          <span />
        )}
        <a
          href={policy}
          className="rounded-xs text-muted underline underline-offset-4 hoverable:hover:text-text"
        >
          <Trans>Read privacy policy</Trans>
        </a>
      </div>
    </SettingsGroup>
  );
}
