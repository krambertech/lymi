import { Trans, useLingui } from "@lingui/react/macro";
import { aiChoice, saveAiChoice } from "@lymi/client/ai-consent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkle } from "lucide-react";
import { settingsQuery } from "../lib/queries";
import { InlineError } from "./inline-error";
import { SettingsGroup } from "./settings-group";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** The account's one AI switch. The web runs AI until the learner says no; the phone waits for a yes. ADR 0038. */
export function AiServicesSection() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const save = useMutation({
    mutationFn: (allowed: boolean) => saveAiChoice(qc, allowed, "settings"),
  });
  const on = save.isPending ? save.variables : aiChoice(settings.data) !== false;

  return (
    <SettingsGroup
      id="ai"
      title={t`AI services`}
      description={t`AI fills in your cards, reads lesson pages in Smart add and says your words aloud.`}
    >
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
              <Sparkle className="size-4" />
            </span>
            <FieldContent className="gap-0.5">
              <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
                <Trans>Use AI services</Trans>
              </FieldLabel>
              <FieldDescription>
                {on
                  ? t`Cards go to OpenAI, lesson pages to Anthropic and Cloudflare, and words to Google, OpenAI or ElevenLabs to be spoken.`
                  : t`Off. Cards stay as you type them, and only your own recordings play.`}
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
    </SettingsGroup>
  );
}
