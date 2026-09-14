import { Trans, useLingui } from "@lingui/react/macro";
import { CardInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type AddCardOutcome, api, type DeckSummary, errorMessage } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { decksQuery } from "../lib/queries";
import { Button } from "./Button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
        qc.invalidateQueries({ queryKey: ["rounds"] }),
      ]);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,440px)]">
        <DialogTitle>{t`Add a card`}</DialogTitle>
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
      <Field>
        <FieldLabel>{t`Term`}</FieldLabel>
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
        <FieldError>{invalid.term}</FieldError>
      </Field>
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>{t`Meaning`}</FieldLabel>
          <span className="text-xs text-muted">{t`Optional`}</span>
        </div>
        <Input
          value={meaning}
          onChange={(e) => {
            setMeaning(e.target.value);
            setInvalid(({ meaning: _, ...rest }) => rest);
          }}
          placeholder={t`to hurry up`}
          autoComplete="off"
        />
        {invalid.meaning ? (
          <FieldError>{invalid.meaning}</FieldError>
        ) : (
          <FieldDescription>{t`Leave it empty and AI can fill it in later.`}</FieldDescription>
        )}
      </Field>
      {noDecks ? (
        <FieldSet className="gap-1.5">
          <FieldLegend variant="label">{t`Deck`}</FieldLegend>
          <Button onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
            <Plus aria-hidden="true" />
            <Trans>New deck</Trans>
          </Button>
          <FieldDescription>
            {t`A card lands in a deck. Create the first one and this card goes in it.`}
          </FieldDescription>
        </FieldSet>
      ) : (
        <Field>
          <FieldLabel>{t`Deck`}</FieldLabel>
          <Select
            value={deck || null}
            onValueChange={(v) => {
              setDeck(v ?? "");
              setInvalid(({ deckId: _, ...rest }) => rest);
            }}
            items={(decks ?? []).map((d) => ({ value: d.id, label: d.name }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t`Choose one`} />
            </SelectTrigger>
            <SelectContent aria-label={t`Deck`}>
              {(decks ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{invalid.deckId}</FieldError>
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
