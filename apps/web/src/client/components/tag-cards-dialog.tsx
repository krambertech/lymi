import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type TagChoice, tagPicker } from "@lymi/client/deck-list";
import { isolate, TAG_LIMITS, tagKey } from "@lymi/core";
import { clsx } from "clsx";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { bidi } from "../lib/bidi";
import { useOpenKey } from "../lib/use-open-key";
import { Button } from "./button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The chosen cards' tags, each list one card's. */
  cards: readonly (readonly string[])[];
  /** Tags in use elsewhere, offered after the ones the cards carry. */
  suggestions?: readonly { name: string }[] | undefined;
  onApply: (change: { add: string[]; remove: string[] }) => void;
}

const row =
  "flex min-h-12 w-full items-center gap-3 px-4 text-start text-base transition-[background-color] duration-150 hoverable:hover:veil";

/** Puts tags on, or takes them off, every chosen card at once. */
export function TagCardsDialog({ open, onOpenChange, ...rest }: Props) {
  const key = useOpenKey(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <TagCardsBody key={key} onClose={() => onOpenChange(false)} {...rest} />
      </DialogContent>
    </Dialog>
  );
}

function TagCardsBody({
  cards,
  suggestions = [],
  onApply,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const { t } = useLingui();
  const [created, setCreated] = useState<string[]>([]);
  const [choices, setChoices] = useState<ReadonlyMap<string, TagChoice>>(new Map());
  const [query, setQuery] = useState("");
  const picker = tagPicker({ cards, created, suggestions, choices, query });
  const { total, shown, typed, fresh, change } = picker;
  const set = (name: string, choice: TagChoice) =>
    setChoices((prev) => new Map(prev).set(tagKey(name), choice));
  const changed = change.add.length + change.remove.length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <Plural value={total} one="Tags for # card" other="Tags for # cards" />
        </DialogTitle>
        <DialogDescription>
          <Trans>Tick a tag to put it on every card, or untick it to take it off.</Trans>
        </DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          // Return puts on the tag named exactly as typed, as the phone's list does; it never takes one off.
          if (!fresh) {
            if (picker.pick) set(picker.pick, "all");
            setQuery("");
            return;
          }
          setCreated((prev) => [...prev, typed]);
          set(typed, "all");
          setQuery("");
        }}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t`Find or create a tag`}
            aria-label={t`Find or create a tag`}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={TAG_LIMITS.length}
            className="ps-9"
          />
        </div>
        <ul className="edge max-h-[50dvh] overflow-y-auto rounded-lg bg-plate">
          {shown.map((name) => {
            const choice = picker.choiceOf(name);
            const after = picker.after(name);
            return (
              <li key={tagKey(name)} className="border-edge not-first:border-t">
                <Field orientation="horizontal" className={row}>
                  <Checkbox
                    checked={choice === "all"}
                    indeterminate={choice === "mixed"}
                    onCheckedChange={() => set(name, picker.next(name))}
                  />
                  <FieldLabel className="min-w-0 flex-1 cursor-pointer truncate py-3 text-base font-normal text-text">
                    {name}
                  </FieldLabel>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {total > 1 && (
                      <Trans>
                        {after} of {total}
                      </Trans>
                    )}
                  </span>
                </Field>
              </li>
            );
          })}
          {fresh && (
            <li className="border-edge not-first:border-t">
              <button type="submit" className={clsx(row, "text-text-2")}>
                <Plus className="size-[18px]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  {bidi(t`Create “${{ typed: isolate(typed) }}”`)}
                </span>
              </button>
            </li>
          )}
          {shown.length === 0 && !fresh && (
            <li className="px-4 py-3 text-base text-muted">
              <Trans>No tags yet. Type one to create it.</Trans>
            </li>
          )}
        </ul>
      </form>
      <DialogFooter>
        <DialogClose
          render={
            <Button variant="ghost">
              <Trans>Cancel</Trans>
            </Button>
          }
        />
        <Button
          variant="primary"
          aria-disabled={changed === 0}
          onClick={() => {
            if (changed === 0) return;
            onApply(change);
            onClose();
          }}
        >
          <Trans>Save</Trans>
        </Button>
      </DialogFooter>
    </>
  );
}
