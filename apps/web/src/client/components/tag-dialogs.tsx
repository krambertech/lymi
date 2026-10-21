import { Trans, useLingui } from "@lingui/react/macro";
import { isolate, TAG_LIMITS, tagKey } from "@lymi/core";
import { useState } from "react";
import { useDesktop } from "../lib/device";
import { useOpenKey } from "../lib/use-open-key";
import { Button } from "./button";
import { InlineError } from "./inline-error";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

interface DeckTag {
  name: string;
  cards: number;
}

interface RenameProps {
  /** The tag being renamed; null when closed. */
  tag: DeckTag | null;
  /** The learner's tags in any deck, so a name already in use reads as a merge. */
  inUse: readonly { name: string }[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (to: string) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/** Renames a tag on this deck's cards; a name already in use merges the two, and the field says so. */
export function RenameTagDialog({ tag, onOpenChange, ...rest }: RenameProps) {
  const { t } = useLingui();
  const key = useOpenKey(!!tag);
  const tagName = tag?.name ?? "";
  return (
    <Dialog open={!!tag} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Rename “${{ tagName: isolate(tagName) }}”`}</DialogTitle>
          <DialogDescription>
            <Trans>Only this deck’s cards change. Other decks keep the tag as it is.</Trans>
          </DialogDescription>
        </DialogHeader>
        {tag && <RenameForm key={key} tag={tag} onCancel={() => onOpenChange(false)} {...rest} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  tag,
  inUse,
  onCancel,
  onSubmit,
  pending,
  error,
}: Omit<RenameProps, "tag" | "onOpenChange"> & { tag: DeckTag; onCancel: () => void }) {
  const { t } = useLingui();
  const desktop = useDesktop();
  const [name, setName] = useState(tag.name);
  const [invalid, setInvalid] = useState<string | undefined>();
  const typed = name.trim();
  const other = inUse.find(
    (used) => tagKey(used.name) === tagKey(typed) && tagKey(used.name) !== tagKey(tag.name),
  );
  const otherName = other?.name ?? "";
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (!typed) return setInvalid(t`Give the tag a name.`);
        if (typed === tag.name) return onCancel();
        void onSubmit(typed);
      }}
    >
      <Field>
        <FieldLabel>{t`Name`}</FieldLabel>
        <Input
          // On touch the drawer settles first and the keyboard waits for a tap on the field.
          autoFocus={desktop}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(undefined);
          }}
          maxLength={TAG_LIMITS.length}
          autoComplete="off"
          enterKeyHint="done"
        />
        {other && !invalid && (
          <FieldDescription>
            <Trans>
              You already have “{{ otherName: isolate(otherName) }}”, so the two merge into one tag
              on these cards.
            </Trans>
          </FieldDescription>
        )}
        <FieldError>{invalid}</FieldError>
      </Field>
      {error && (
        <p className="text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      )}
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {other ? <Trans>Merge</Trans> : <Trans>Rename</Trans>}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface MergeProps {
  /** The tag being merged away; null when closed. */
  tag: DeckTag | null;
  /** The deck's other tags, any of which it can merge into. */
  tags: readonly DeckTag[];
  onOpenChange: (open: boolean) => void;
  onMerge: (into: DeckTag) => void;
}

const row =
  "flex min-h-12 w-full items-center gap-3 px-4 text-start text-base transition-[background-color] duration-150 hoverable:hover:veil";

/** Picks the tag of this deck that another one merges into. */
export function MergeTagDialog({ tag, tags, onOpenChange, onMerge }: MergeProps) {
  const { t, i18n } = useLingui();
  const tagName = tag?.name ?? "";
  const others = tags.filter((other) => tagKey(other.name) !== tagKey(tagName));
  return (
    <Dialog open={!!tag} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t`Merge “${{ tagName: isolate(tagName) }}” into`}</DialogTitle>
          <DialogDescription>
            <Trans>Its cards take the other tag instead, here in this deck only.</Trans>
          </DialogDescription>
        </DialogHeader>
        <ul className="edge max-h-[50dvh] overflow-y-auto rounded-lg bg-plate">
          {others.map((other) => (
            <li key={tagKey(other.name)} className="border-edge not-first:border-t">
              <button type="button" className={row} onClick={() => onMerge(other)}>
                <span className="min-w-0 flex-1 truncate">{other.name}</span>
                <span className="shrink-0 text-sm text-muted tabular-nums">
                  {i18n.number(other.cards)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost">
                <Trans>Cancel</Trans>
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
