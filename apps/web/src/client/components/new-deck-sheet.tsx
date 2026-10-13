import { Trans, useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import {
  DeckInput,
  type DeckPurpose,
  type Directions,
  deckLimits,
  LanguageTag,
  type LearningKind,
} from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { useRef, useState } from "react";
import { errorMessage } from "../lib/api";
import { useDesktop } from "../lib/device";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { decksQuery, settingsQuery } from "../lib/queries";
import { Button } from "./button";
import { DirectionSelect, LanguageField, PurposeField } from "./deck-fields";
import { InlineError } from "./inline-error";
import { useStaticNav } from "./nav-link";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { toast } from "./ui/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Welcome's answer as a deck purpose: a test is a subject, and a typed language name is no tag. */
function seedFrom(kind: LearningKind | null, language: string | null): NewDeckSeed | undefined {
  if (!kind) return undefined;
  if (kind !== "language") return { purpose: kind === "other" ? "other" : "subject" };
  const tag = LanguageTag.safeParse(language);
  return { purpose: "language", language: tag.success ? tag.data : null };
}

/**
 * A deck is a name, what it is for, and how it is asked, so it is one sheet rather than a wizard.
 * Creating it lands the learner in the empty deck, which is where the words go next.
 */
export function NewDeckSheet({ open, onOpenChange }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const settings = useQuery({ ...settingsQuery, enabled: open });
  const decks = useQuery({ ...decksQuery, enabled: open });
  // Welcome already asked what the learner is learning, so their first deck of their own starts there.
  const first = decks.isSuccess && !decks.data.some((d) => d.role === "owner");
  const seed = first
    ? seedFrom(settings.data?.learningKind ?? null, settings.data?.learningLanguage ?? null)
    : undefined;
  const create = useMutation({
    mutationFn: (input: DeckInput) => writes.createDeck(input),
    onSuccess: ({ id, queued }) => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      onOpenChange(false);
      navigate({ to: "/library/$deckId", params: { deckId: id } });
      if (queued) toast.add({ title: t`Saved on this device until Lymi can be reached.` });
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t`New deck`}</DialogTitle>
        <NewDeckForm
          key={`${open}:${seed?.purpose ?? ""}`}
          seed={seed}
          pending={create.isPending}
          error={create.isError ? errorMessage(create.error) : undefined}
          onCancel={() => onOpenChange(false)}
          onSubmit={(input) => create.mutateAsync(input)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** What the form starts with: Welcome's answer, for the learner's first deck. */
export interface NewDeckSeed {
  purpose: DeckPurpose;
  language?: string | null | undefined;
}

export interface NewDeckFormProps {
  seed?: NewDeckSeed | undefined;
  pending?: boolean | undefined;
  error?: string | undefined;
  onCancel: () => void;
  onSubmit: (input: DeckInput) => Promise<unknown> | undefined;
}

/** The sheet's body, on its own so it can be shown without the sheet around it. */
export function NewDeckForm({ seed, pending, error, onCancel, onSubmit }: NewDeckFormProps) {
  const { t } = useLingui();
  const st = !!useStaticNav();
  const desktop = useDesktop();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<DeckPurpose | null>(seed?.purpose ?? null);
  const [language, setLanguage] = useState<string | null>(seed?.language ?? null);
  const [directions, setDirections] = useState<Directions>("recognition");
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        // The same schema the route parses with, so the field cannot disagree with the API.
        const parsed = DeckInput.safeParse({
          name,
          purpose: purpose ?? undefined,
          // Only a language deck asks for a language, so another keeps none it was given before.
          defaultLanguage: purpose === "language" ? language : null,
          directions,
        });
        // The app asks what every deck is for, and a language deck which language, though the API need not.
        const missing: FieldErrors = {
          ...(purpose ? {} : { purpose: t`Choose what the deck is for.` }),
          ...(purpose === "language" && !language
            ? { defaultLanguage: t`Choose the language you’re learning.` }
            : {}),
        };
        if (!parsed.success || Object.keys(missing).length > 0) {
          // The sentences mirror the schema's: an empty name fails the minimum, a typed one the
          // maximum; a tag the picker accepted can only be too long.
          setInvalid({
            ...missing,
            ...(parsed.success
              ? {}
              : fieldErrors(parsed.error, {
                  name: name.trim()
                    ? t`Keep the name under 80 characters.`
                    : t`Give the deck a name.`,
                  defaultLanguage:
                    language && language.length > 12
                      ? t`Keep the language tag under 12 characters.`
                      : t`Use a language tag like ca, pt-BR or zh-Hant.`,
                })),
          });
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        void onSubmit(parsed.data);
      }}
    >
      <Field>
        <FieldLabel>{t`Name`}</FieldLabel>
        <Input
          // On touch the drawer settles first and the keyboard waits for a tap on the field.
          autoFocus={!st && desktop}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...rest }) => rest);
          }}
          placeholder={t`Lesson 15`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={deckLimits.name ?? undefined}
        />
        <FieldError>{invalid.name}</FieldError>
      </Field>
      <PurposeField
        value={purpose}
        onChange={(next) => {
          setPurpose(next);
          setInvalid(({ purpose: _, ...rest }) => rest);
        }}
        error={invalid.purpose}
        description={t`AI fills the deck’s cards to suit it.`}
        descriptionFirst
      />
      {purpose === "language" && (
        <LanguageField
          value={language}
          onChange={(next) => {
            setLanguage(next);
            setInvalid(({ defaultLanguage: _, ...rest }) => rest);
          }}
          error={invalid.defaultLanguage}
          descriptionFirst
        />
      )}
      <DirectionSelect value={directions} onChange={setDirections} />
      <div
        className={cn(
          "flex items-center gap-2 pt-1",
          // In a drawer the actions stay at its foot, above the software keyboard.
          !desktop && "sticky bottom-0 -mx-4 -mb-5 bg-plate px-4 pt-3 pb-5",
        )}
      >
        <p className="flex-1 text-sm" role="status">
          {error && <InlineError>{error}</InlineError>}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          <Trans>Create deck</Trans>
        </Button>
      </div>
    </form>
  );
}
