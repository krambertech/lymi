import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { type AddCardOutcome, api, type DeckSummary } from "../lib/api";
import { decksQuery } from "../lib/queries";
import { Button } from "./Button";
import { Field, Input, Select } from "./Field";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
}

type CardInput = Parameters<typeof api.addCard>[0];

/** Quick capture. One field that matters, a deck, add. AI enrichment comes later and is opt-in. */
export function AddCardSheet({ open, onOpenChange, deckId }: Props) {
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
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-(--z-backdrop) bg-scrim" />
        <Drawer.Content
          className="edge-2 fixed inset-x-0 bottom-0 z-(--z-sheet) mx-auto w-full max-w-md rounded-t-xl bg-plate outline-none pb-safe @3xl:bottom-6 @3xl:rounded-xl"
          aria-describedby={undefined}
        >
          <Drawer.Title className="sr-only">Add a word or phrase</Drawer.Title>
          <AddCardForm
            decks={decks.data}
            deckId={deckId}
            pending={create.isPending}
            error={create.isError ? (create.error as Error).message : undefined}
            onCancel={() => onOpenChange(false)}
            onSubmit={(input) => create.mutateAsync(input)}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export interface AddCardFormProps {
  decks: DeckSummary[] | undefined;
  deckId?: string | undefined;
  pending?: boolean | undefined;
  error?: string | undefined;
  onCancel: () => void;
  /** Resolves with the outcome. A duplicate is skipped and names the card that already exists. */
  onSubmit: (input: CardInput) => Promise<AddCardOutcome | undefined> | AddCardOutcome | undefined;
  /** No autofocus and no grabber. For the design page. */
  static?: boolean | undefined;
}

/** The sheet's body, on its own so it can be shown without the drawer. */
export function AddCardForm({
  decks,
  deckId,
  pending,
  error,
  onCancel,
  onSubmit,
  static: st,
}: AddCardFormProps) {
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [deck, setDeck] = useState(deckId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deck && decks?.[0]) setDeck(decks[0].id);
  }, [decks, deck]);

  const canAdd = term.trim().length > 0 && deck.length > 0 && !pending;
  const deckName = decks?.find((d) => d.id === deck)?.name;

  return (
    <form
      className="grid gap-4 p-4 pb-5 @3xl:p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canAdd) return;
        const t = term.trim();
        const outcome = await onSubmit({
          deckId: deck,
          term: t,
          meaning: meaning.trim() || undefined,
          meaningSource: meaning.trim() ? "manual" : undefined,
        });
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
      {!st && (
        <div
          className="mx-auto -mt-1 h-1 w-9 rounded-full bg-edge-2 @3xl:hidden"
          aria-hidden="true"
        />
      )}
      <Field label="Word or phrase">
        <Input
          ref={inputRef}
          autoFocus={!st}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setNotice(null);
          }}
          placeholder="sbrigarsi"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          fieldSize="lg"
        />
      </Field>
      <Field label="Meaning" aside="Optional" hint="Leave it empty and AI can suggest one later.">
        <Input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="to hurry up"
          autoComplete="off"
        />
      </Field>
      <Field label="Deck">
        <Select value={deck} onChange={(e) => setDeck(e.target.value)}>
          {decks?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex items-center gap-2 pt-1">
        <p className="flex-1 text-sm text-muted" role="status">
          {error ? <span className="text-danger">{error}</span> : notice}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!canAdd} loading={pending}>
          {deckName ? `Add to ${deckName}` : "Add"}
        </Button>
      </div>
    </form>
  );
}
