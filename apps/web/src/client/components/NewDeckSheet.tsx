import { Trans, useLingui } from "@lingui/react/macro";
import { DeckInput, type Directions } from "@lymi/core";
import type { Deck } from "@lymi/core/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { Button } from "./Button";
import { DirectionCompact, LanguageField } from "./DeckFields";
import { Field, Input } from "./Field";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A deck is a name and two settings, so it is one sheet rather than a wizard: the name is the
 * field that matters and the rest already has an answer. Creating it lands the learner in the
 * empty deck, which is where the words go next.
 */
export function NewDeckSheet({ open, onOpenChange }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: (input: DeckInput) => api.createDeck(input),
    onSuccess: (deck) => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      onOpenChange(false);
      navigate({ to: "/library/$deckId", params: { deckId: deck.id } });
    },
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t`New deck`}>
      <NewDeckForm
        key={open ? "open" : "closed"}
        pending={create.isPending}
        error={create.isError ? (create.error as Error).message : undefined}
        onCancel={() => onOpenChange(false)}
        onSubmit={(input) => create.mutateAsync(input)}
      />
    </Sheet>
  );
}

export interface NewDeckFormProps {
  pending?: boolean | undefined;
  error?: string | undefined;
  onCancel: () => void;
  onSubmit: (input: DeckInput) => Promise<Deck | undefined> | undefined;
  /** No autofocus. For the design page. */
  static?: boolean | undefined;
}

/** The sheet's body, on its own so it can be shown without the sheet around it. */
export function NewDeckForm({ pending, error, onCancel, onSubmit, static: st }: NewDeckFormProps) {
  const { t } = useLingui();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
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
        const parsed = DeckInput.safeParse({ name, defaultLanguage: language, directions });
        if (!parsed.success) {
          // The sentences mirror the schema's: an empty name fails the minimum, a typed one the
          // maximum; a tag the picker accepted can only be too long.
          setInvalid(
            fieldErrors(parsed.error, {
              name: name.trim() ? t`Keep the name under 80 characters.` : t`Give the deck a name.`,
              defaultLanguage:
                language && language.length > 12
                  ? t`That is too long for a language tag.`
                  : t`Use a language tag like ca, pt-BR or zh-Hant.`,
            }),
          );
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        void onSubmit(parsed.data);
      }}
    >
      <Field label={t`Name`} error={invalid.name}>
        <Input
          autoFocus={!st}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...rest }) => rest);
          }}
          placeholder={t`Lesson 15`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={80}
        />
      </Field>
      <LanguageField
        value={language}
        onChange={(next) => {
          setLanguage(next);
          setInvalid(({ defaultLanguage: _, ...rest }) => rest);
        }}
        error={invalid.defaultLanguage}
      />
      <DirectionCompact value={directions} onChange={setDirections} />
      <div className="flex items-center gap-2 pt-1">
        <p className="flex-1 text-sm text-danger" role="status">
          {error}
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
