import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { api } from "../lib/api";
import { decksQuery } from "../lib/queries";
import { Button } from "./Button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string;
}

/** Quick capture. One field, a deck, add. AI enrichment comes later and is opt-in. */
export function AddCardSheet({ open, onOpenChange, deckId }: Props) {
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [deck, setDeck] = useState(deckId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deck && decks.data?.[0]) setDeck(decks.data[0].id);
  }, [decks.data, deck]);

  const create = useMutation({
    mutationFn: () =>
      api.addCard({
        deckId: deck,
        term: term.trim(),
        meaning: meaning.trim() || undefined,
        meaningSource: meaning ? "manual" : undefined,
      }),
    onSuccess: (outcome) => {
      if (outcome.status === "skipped") {
        setNotice(`${outcome.existing.term} is already in ${outcome.deckName}`);
        inputRef.current?.select();
        return;
      }
      setNotice(null);
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      setTerm("");
      setMeaning("");
      inputRef.current?.focus();
    },
  });

  const canAdd = term.trim().length > 0 && deck.length > 0 && !create.isPending;
  const deckName = decks.data?.find((d) => d.id === deck)?.name;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-xl bg-surface border border-border outline-none pb-safe"
          aria-describedby={undefined}
        >
          <form
            className="p-4 pb-5 grid gap-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (canAdd) create.mutate();
            }}
          >
            <div className="mx-auto h-1 w-9 rounded-full bg-border-strong" aria-hidden="true" />
            <Drawer.Title className="sr-only">Add a word or phrase</Drawer.Title>
            <label className="grid gap-1.5">
              <span className="text-[12.5px] font-medium text-muted">Word or phrase</span>
              <input
                ref={inputRef}
                // biome-ignore lint/a11y/noAutofocus: the sheet exists to type into this field
                autoFocus
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setNotice(null);
                }}
                className="h-11 w-full rounded-md border border-border-strong bg-bg px-3.5 text-[17px] placeholder:text-muted focus:border-amber focus:outline-none focus:ring-[3px] focus:ring-amber-soft"
                placeholder="sbrigarsi"
                autoComplete="off"
                autoCapitalize="none"
                enterKeyHint="done"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12.5px] font-medium text-muted">Meaning (optional)</span>
              <input
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                className="h-10 w-full rounded-md border border-border-strong bg-bg px-3.5 text-[16px] placeholder:text-muted focus:border-amber focus:outline-none focus:ring-[3px] focus:ring-amber-soft"
                placeholder="to hurry up"
                autoComplete="off"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12.5px] font-medium text-muted">Deck</span>
              <select
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                className="h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-[16px]"
              >
                {decks.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {notice && (
              <p className="text-[13px] text-muted" role="status">
                {notice}
              </p>
            )}
            {create.isError && (
              <p className="text-[13px] text-amber-text">{(create.error as Error).message}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={!canAdd}
                className="flex-1"
              >
                {deckName ? `Add to ${deckName}` : "Add"}
              </Button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
