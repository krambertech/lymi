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
    <Sheet open={open} onOpenChange={onOpenChange} title="New deck">
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
          setInvalid(fieldErrors(parsed.error));
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        void onSubmit(parsed.data);
      }}
    >
      <Field label="Name" error={invalid.name}>
        <Input
          autoFocus={!st}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...rest }) => rest);
          }}
          placeholder="Lesson 15"
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
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          Create deck
        </Button>
      </div>
    </form>
  );
}
