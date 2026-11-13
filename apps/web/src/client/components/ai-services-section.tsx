import { Trans, useLingui } from "@lingui/react/macro";
import { aiChoice, saveAiChoice } from "@lymi/client/ai-consent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkle } from "lucide-react";
import { localizedSiteUrl } from "../lib/origins";
import { settingsQuery } from "../lib/queries";
import { InlineError } from "./inline-error";
import { SettingsGroup } from "./settings-group";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** The account's one AI switch. The web runs AI until the learner says no; the phone waits for a yes. ADR 0039. */
export function AiServicesSection() {
  const { t, i18n } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery({ ...settingsQuery, refetchOnMount: "always" });
  const save = useMutation({
    mutationFn: (allowed: boolean) => saveAiChoice(qc, allowed, "settings"),
  });
  const on = save.isPending ? save.variables : aiChoice(settings.data) !== false;

  return (
    <SettingsGroup
      id="ai"
      title={t`AI services`}
      description={
        <Trans>
          AI fills in your cards, finds terms in lesson material and reads terms and examples aloud.
        </Trans>
      }
    >
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
              <Sparkle className="size-4" />
            </span>
            <FieldContent className="gap-0.5">
              <FieldLabel className="text-base text-ink after:absolute after:inset-0 after:content-['']">
                <Trans>Use AI services</Trans>
              </FieldLabel>
              <FieldDescription>
                {on
                  ? t`On for mobile and web.`
                  : t`Off for mobile and web. Existing card text and saved audio stay.`}
              </FieldDescription>
            </FieldContent>
            <Switch
              className="self-center"
              checked={on}
              onCheckedChange={(allowed) => save.mutate(allowed)}
            />
          </Field>
        </div>
        {save.isError && (
          <InlineError className="mt-2">
            <Trans>Couldn’t save the choice. Check your connection and try again.</Trans>
          </InlineError>
        )}
      </div>
      <p className="max-w-[60ch] text-sm text-ink-muted">
        <Trans>
          These features send relevant card text and lesson material to third-party AI services.
        </Trans>{" "}
        <a
          className="font-medium text-amber-text underline underline-offset-2"
          href={localizedSiteUrl("/privacy", i18n.locale)}
        >
          <Trans>See what’s shared and with whom in our privacy policy.</Trans>
        </a>
      </p>
    </SettingsGroup>
  );
}
