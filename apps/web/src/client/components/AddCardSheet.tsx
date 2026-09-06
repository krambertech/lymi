import { CardInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type AddCardOutcome, api, type DeckSummary } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { decksQuery } from "../lib/queries";
import { Button } from "./Button";
import { Field, Input, Select } from "./Field";
import { Sheet } from "./Sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
  /** A word needs a deck to land in, so the first run offers to make one. */
  onCreateDeck?: (() => void) | undefined;
}

/** Quick capture. One field that matters, a deck, add. AI enrichment comes later and is opt-in. */
export function AddCardSheet({ open, onOpenChange, deckId, onCreateDeck }: Props) {
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const create = useMutation({
    mutationFn: (input: CardInput) => api.addCard(input),
    onSuccess: (outcome) => {
      if (outcome.status === "skipped") return;
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add a word or phrase" titleHidden>
      <AddCardForm
        decks={decks.data}
        deckId={deckId}
        pending={create.isPending}
        error={create.isError ? (create.error as Error).message : undefined}
        onCancel={() => onOpenChange(false)}
        onCreateDeck={
          onCreateDeck &&
          (() => {
            onOpenChange(false);
            onCreateDeck();
          })
        }
        onSubmit={(input) => create.mutateAsync(input)}
      />
    </Sheet>
  );
}

export interface AddCardFormProps {
  decks: DeckSummary[] | undefined;
  deckId?: string | undefined;
  pending?: boolean | undefined;
  error?: string | undefined;
  onCancel: () => void;
  /** Offered when there is no deck to add to yet. */
  onCreateDeck?: (() => void) | undefined;
  /** Resolves with the outcome. A duplicate is skipped and names the card that already exists. */
  onSubmit: (input: CardInput) => Promise<AddCardOutcome | undefined> | AddCardOutcome | undefined;
  /** No autofocus. For the design page. */
  static?: boolean | undefined;
}

/** The sheet's body, on its own so it can be shown without the sheet around it. */
export function AddCardForm({
  decks,
  deckId,
  pending,
  error,
  onCancel,
  onCreateDeck,
  onSubmit,
  static: st,
}: AddCardFormProps) {
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [deck, setDeck] = useState(deckId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!deck && decks?.[0]) setDeck(decks[0].id);
  }, [decks, deck]);

  const noDecks = decks?.length === 0;
  const deckName = decks?.find((d) => d.id === deck)?.name;

  return (
    <form
      ref={formRef}
      className="grid gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        // The same schema the route parses with, so the field cannot disagree with the API.
        const parsed = CardInput.safeParse({
          deckId: deck,
          term,
          meaning: meaning.trim() || undefined,
          meaningSource: meaning.trim() ? "manual" : undefined,
        });
        if (!parsed.success) {
          setInvalid(fieldErrors(parsed.error));
          setNotice(null);
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        const t = parsed.data.term;
        const outcome = await onSubmit(parsed.data);
        if (outcome?.status === "skipped") {
          setNotice(`${outcome.existing.term} is already in ${outcome.deckName}`);
          inputRef.current?.select();
          return;
        }
        setNotice(`Added “${t}”`);
        setTerm("");
        setMeaning("");
        inputRef.current?.focus();
      }}
    >
      <Field label="Word or phrase" error={invalid.term}>
        <Input
          ref={inputRef}
          autoFocus={!st}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setNotice(null);
            setInvalid(({ term: _, ...rest }) => rest);
          }}
          placeholder="sbrigarsi"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
        />
      </Field>
      <Field
        label="Meaning"
        aside="Optional"
        hint="Leave it empty and AI can suggest one later."
        error={invalid.meaning}
      >
        <Input
          value={meaning}
          onChange={(e) => {
            setMeaning(e.target.value);
            setInvalid(({ meaning: _, ...rest }) => rest);
          }}
          placeholder="to hurry up"
          autoComplete="off"
        />
      </Field>
      {noDecks ? (
        <Field
          label="Deck"
          hint="A word lands in a deck. Make the first one and this word goes in it."
        >
          <Button onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
            <Plus aria-hidden="true" />
            New deck
          </Button>
        </Field>
      ) : (
        <Field label="Deck" error={invalid.deckId}>
          <Select
            value={deck}
            onChange={(e) => {
              setDeck(e.target.value);
              setInvalid(({ deckId: _, ...rest }) => rest);
            }}
          >
            {decks?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex items-center gap-2 pt-1">
        <p className="flex-1 text-sm text-muted" role="status">
          {error ? <span className="text-danger">{error}</span> : notice}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {deckName ? `Add to ${deckName}` : "Add"}
        </Button>
      </div>
    </form>
  );
}
