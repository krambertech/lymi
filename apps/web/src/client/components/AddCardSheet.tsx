import { Trans, useLingui } from "@lingui/react/macro";
import { CardInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type AddCardOutcome, api, type DeckSummary, errorMessage } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { decksQuery } from "../lib/queries";
import { Button } from "./Button";
import { Select } from "./Combobox";
import { Field, Input } from "./Field";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

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
  const { t } = useLingui();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const create = useMutation({
    mutationFn: (input: CardInput) => api.addCard(input),
    onSuccess: async (outcome) => {
      if (outcome.status === "skipped") return;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["queue"] }),
      ]);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,440px)]">
        {/* The term field says what this is; the name stays for screen readers. */}
        <DialogTitle className="sr-only">{t`Add a card`}</DialogTitle>
        <AddCardForm
          key={open ? `open:${deckId ?? "default"}` : "closed"}
          decks={decks.data}
          deckId={deckId}
          pending={create.isPending}
          error={create.isError ? errorMessage(create.error) : undefined}
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
      </DialogContent>
    </Dialog>
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
  const { t } = useLingui();
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
          // The sentences mirror the schema's: an empty term fails the minimum, a typed one the maximum.
          setInvalid(
            fieldErrors(parsed.error, {
              deckId: t`Choose a deck for it to go in.`,
              term: term.trim() ? t`Keep the term under 500 characters.` : t`Type the term.`,
              meaning: t`Keep the meaning under 1000 characters.`,
            }),
          );
          setNotice(null);
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        const added = parsed.data.term;
        const outcome = await onSubmit(parsed.data);
        if (outcome?.status === "skipped") {
          setNotice(t`${outcome.existing.term} is already in ${outcome.deckName}`);
          inputRef.current?.select();
          return;
        }
        setNotice(t`Added “${added}”`);
        setTerm("");
        setMeaning("");
        inputRef.current?.focus();
      }}
    >
      <Field label={t`Term`} error={invalid.term}>
        <Input
          ref={inputRef}
          autoFocus={!st}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setNotice(null);
            setInvalid(({ term: _, ...rest }) => rest);
          }}
          placeholder={t`sbrigarsi`}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
        />
      </Field>
      <Field
        label={t`Meaning`}
        aside={t`Optional`}
        hint={t`Leave it empty and AI can fill it in later.`}
        error={invalid.meaning}
      >
        <Input
          value={meaning}
          onChange={(e) => {
            setMeaning(e.target.value);
            setInvalid(({ meaning: _, ...rest }) => rest);
          }}
          placeholder={t`to hurry up`}
          autoComplete="off"
        />
      </Field>
      {noDecks ? (
        <Field
          label={t`Deck`}
          hint={t`A card lands in a deck. Create the first one and this card goes in it.`}
        >
          <Button onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
            <Plus aria-hidden="true" />
            <Trans>New deck</Trans>
          </Button>
        </Field>
      ) : (
        <Field label={t`Deck`} error={invalid.deckId}>
          <Select
            value={deck || null}
            onChange={(v) => {
              setDeck(v ?? "");
              setInvalid(({ deckId: _, ...rest }) => rest);
            }}
            options={(decks ?? []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Field>
      )}
      <div className="flex items-center gap-2 pt-1">
        <p className="flex-1 text-sm text-muted" role="status">
          {error ? <span className="text-danger">{error}</span> : notice}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {deckName ? t`Add to ${deckName}` : t`Add`}
        </Button>
      </div>
    </form>
  );
}
