import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { TAG_LIMITS, tagKey } from "@lymi/core";
import { clsx } from "clsx";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
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

/** Where a tag ends up on the chosen cards: on every one, off every one, or left as it is. */
type Choice = "all" | "none" | "mixed";

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
  const total = cards.length;
  // Each tag the cards carry, under its key, with how many carry it.
  const carried = new Map<string, { name: string; count: number }>();
  for (const tags of cards)
    for (const name of tags) {
      const seen = carried.get(tagKey(name));
      if (seen) seen.count += 1;
      else carried.set(tagKey(name), { name, count: 1 });
    }
  const [created, setCreated] = useState<string[]>([]);
  const [choices, setChoices] = useState<ReadonlyMap<string, Choice>>(new Map());
  const [query, setQuery] = useState("");

  const offered = [
    ...[...carried.values()].sort((a, b) => b.count - a.count).map((tag) => tag.name),
    ...created,
    ...suggestions.map((tag) => tag.name),
  ].filter((name, i, all) => all.findIndex((other) => tagKey(other) === tagKey(name)) === i);
  const typed = query.trim().slice(0, TAG_LIMITS.length);
  const shown = typed ? offered.filter((name) => tagKey(name).includes(tagKey(typed))) : offered;
  const fresh = typed && !offered.some((name) => tagKey(name) === tagKey(typed));

  const start = (name: string): Choice => {
    const count = carried.get(tagKey(name))?.count ?? 0;
    return count === 0 ? "none" : count === total ? "all" : "mixed";
  };
  const choiceOf = (name: string) => choices.get(tagKey(name)) ?? start(name);
  // A tag on some cards goes on all of them first, then off all, then back as it was.
  const next = (name: string): Choice => {
    const now = choiceOf(name);
    if (now === "all") return "none";
    if (now === "mixed") return "all";
    return start(name) === "mixed" ? "mixed" : "all";
  };
  const set = (name: string, choice: Choice) =>
    setChoices((prev) => new Map(prev).set(tagKey(name), choice));

  const add = offered.filter((name) => choiceOf(name) === "all" && start(name) !== "all");
  const remove = offered.filter((name) => choiceOf(name) === "none" && start(name) !== "none");
  const changed = add.length + remove.length;

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
          if (!fresh) return;
          setCreated((prev) => [typed, ...prev]);
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
            const choice = choiceOf(name);
            const count = carried.get(tagKey(name))?.count ?? 0;
            const after = choice === "all" ? total : choice === "none" ? 0 : count;
            return (
              <li key={tagKey(name)} className="border-edge not-first:border-t">
                <Field orientation="horizontal" className={row}>
                  <Checkbox
                    checked={choice === "all"}
                    indeterminate={choice === "mixed"}
                    onCheckedChange={() => set(name, next(name))}
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
                <span className="min-w-0 flex-1 truncate">{t`Create “${typed}”`}</span>
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
            onApply({ add, remove });
            onClose();
          }}
        >
          <Trans>Save</Trans>
        </Button>
      </DialogFooter>
    </>
  );
}
