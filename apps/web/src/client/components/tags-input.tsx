import { Autocomplete } from "@base-ui/react/autocomplete";
import { Plural, useLingui } from "@lingui/react/macro";
import { TAG_LIMITS, tagKey } from "@lymi/core";
import { cn } from "cn";
import { Plus, X } from "lucide-react";
import { type FocusEvent, type Ref, useImperativeHandle, useRef, useState } from "react";
import { useOverlayShape } from "../lib/device";
import { useField, useFieldControl } from "./ui/field";
import { controlBase, controlText } from "./ui/input";
import { choicePopupClassName, choiceRowClassName, touchRowClassName } from "./ui/overlay-list";

interface Props {
  value: string[];
  onValueChange: (tags: string[]) => void;
  /** Tags already in use, offered while a name is typed, with how many cards carry each. */
  suggestions?: readonly TagSuggestion[] | undefined;
  /** Each tag that joins the list: picked from the suggestions or typed, and whether it was in use. */
  onTagAdded?: ((via: "suggestion" | "typed", inUse: boolean) => void) | undefined;
  placeholder?: string | undefined;
  /** Posts each tag under this name with a native form. */
  name?: string | undefined;
  onBlur?: ((event: FocusEvent<HTMLInputElement>) => void) | undefined;
  disabled?: boolean | undefined;
  /** The text field inside the box. */
  ref?: Ref<HTMLInputElement> | undefined;
}

export interface TagSuggestion {
  name: string;
  cards?: number | undefined;
}

type Row =
  | { kind: "tag"; name: string; cards?: number | undefined }
  | { kind: "create"; name: string };

const SHOWN = 6;

/**
 * Tags typed one at a time: Enter or a comma adds one, Backspace on an empty field takes the last
 * back. As a name is typed, tags in use show under the box with their card counts, and a last row
 * creates the name as typed; Enter adds what was typed unless an arrow key picked a row.
 */
export function TagsInput({
  value,
  onValueChange,
  suggestions = [],
  onTagAdded,
  placeholder,
  name,
  onBlur,
  disabled,
  ref,
}: Props) {
  const { t } = useLingui();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
  const control = useFieldControl({});
  const field = useField();
  const off = disabled || field?.disabled || false;
  // A touch screen's field sits in a drawer over the keyboard, so its rows follow the box in place.
  const touch = useOverlayShape(open) === "touch";

  const full = value.length >= TAG_LIMITS.count;
  const taken = new Set(value.map(tagKey));
  const known = new Map(suggestions.map((tag) => [tagKey(tag.name), tag.name]));
  // Names that start with what was typed come first, then names that contain it, most used first.
  const typed = tagKey(draft);
  const matches: Row[] = typed
    ? suggestions
        .filter((tag) => !taken.has(tagKey(tag.name)) && tagKey(tag.name).includes(typed))
        .sort(
          (a, b) =>
            Number(tagKey(b.name).startsWith(typed)) - Number(tagKey(a.name).startsWith(typed)),
        )
        .slice(0, SHOWN)
        .map((tag) => ({ kind: "tag", ...tag }))
    : [];
  // A name that is neither a tag in use nor already on the card can be created as typed.
  const fresh = typed && !known.has(typed) && !taken.has(typed);
  const created = draft.trim();
  const rows: Row[] = fresh ? [...matches, { kind: "create", name: created }] : matches;

  // A pasted "streets, signs" is two tags, and a tag already in use keeps its spelling.
  const add = (raw: string, via: "suggestion" | "typed" = "typed") => {
    setDraft("");
    const next = [...value];
    const keys = new Set(next.map(tagKey));
    for (const part of raw.split(",")) {
      const tag = part.trim().slice(0, TAG_LIMITS.length);
      if (!tag || keys.has(tagKey(tag)) || next.length >= TAG_LIMITS.count) continue;
      keys.add(tagKey(tag));
      next.push(known.get(tagKey(tag)) ?? tag);
      onTagAdded?.(via, known.has(tagKey(tag)));
    }
    if (next.length !== value.length) onValueChange(next);
  };

  const row = cn(choiceRowClassName, touch && touchRowClassName);
  const list = (
    <Autocomplete.List aria-labelledby={field?.labelId} className="scroll-py-1 outline-none">
      {rows.map((item) =>
        item.kind === "tag" ? (
          <Autocomplete.Item
            key={`tag:${item.name}`}
            value={item}
            onClick={() => add(item.name, "suggestion")}
            className={row}
          >
            <span className="truncate">{item.name}</span>
            {item.cards !== undefined && (
              <span className="ms-auto shrink-0 ps-3 text-sm text-muted tabular-nums">
                <Plural value={item.cards} one="# card" other="# cards" />
              </span>
            )}
          </Autocomplete.Item>
        ) : (
          <div key="create">
            {matches.length > 0 && <div aria-hidden="true" className="mx-1.5 my-1 h-px bg-edge" />}
            <Autocomplete.Item value={item} onClick={() => add(item.name)} className={row}>
              <Plus className="size-4 shrink-0 text-text-2" aria-hidden="true" />
              <span className="truncate">{t`Create “${created}”`}</span>
            </Autocomplete.Item>
          </div>
        ),
      )}
    </Autocomplete.List>
  );

  return (
    <Autocomplete.Root
      items={rows}
      filter={null}
      itemToStringValue={(item: Row) => item.name}
      value={draft}
      onValueChange={(next, details) => {
        // A row's own press adds it, so the text it would fill in is dropped.
        if (details.reason === "item-press") return;
        if (next.includes(",")) add(next);
        else setDraft(next.slice(0, TAG_LIMITS.length));
      }}
      inline={touch}
      open={(touch || open) && rows.length > 0}
      onOpenChange={setOpen}
      onItemHighlighted={(item) => setHighlighted((item as Row | undefined)?.name)}
      disabled={off}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a click on the box's padding lands in its field. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the field inside takes the keyboard. */}
      <div
        ref={boxRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }}
        data-disabled={off || undefined}
        className={cn(
          controlBase,
          "flex min-h-11 cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 md:min-h-10",
          "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring",
          "data-disabled:cursor-not-allowed data-disabled:bg-plate-2",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 max-w-full items-center gap-0.5 rounded-full bg-plate-2 ps-2.5 pe-0.5 text-sm font-medium text-text-2"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              disabled={off}
              onClick={() => {
                onValueChange(value.filter((v) => v !== tag));
                inputRef.current?.focus();
              }}
              aria-label={t`Remove the tag ${tag}`}
              // As large as the tag and the gaps around it allow without reaching a neighbour.
              className="relative grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors before:absolute before:-inset-x-1 before:-inset-y-[5px] before:content-[''] hoverable:hover:bg-hover hoverable:hover:text-text disabled:pointer-events-none"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
            {name && <input type="hidden" name={name} value={tag} disabled={off} />}
          </span>
        ))}
        <Autocomplete.Input
          ref={inputRef}
          {...control}
          disabled={off}
          // Full, the field still takes Backspace to give the last tag back.
          readOnly={full || undefined}
          autoComplete="off"
          enterKeyHint="enter"
          placeholder={
            full ? t`That’s the most tags a card can have` : value.length ? undefined : placeholder
          }
          onKeyDown={(e) => {
            // Enter with a name typed adds it, unless an arrow key picked a tag in use; with nothing
            // typed it submits the form as usual.
            if (e.key === "Enter" && draft.trim() && highlighted === undefined) {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onValueChange(value.slice(0, -1));
            }
          }}
          onBlur={(e) => {
            if (draft.trim()) add(draft);
            onBlur?.(e);
          }}
          className={cn(
            controlText,
            "h-7 min-w-24 flex-1 bg-transparent px-1.5 text-text outline-none placeholder:text-muted disabled:cursor-not-allowed",
          )}
        />
      </div>
      {touch ? (
        rows.length > 0 && <div className="mt-1.5 rounded-md bg-plate-2 p-1">{list}</div>
      ) : (
        <Autocomplete.Portal>
          <Autocomplete.Positioner
            anchor={boxRef}
            sideOffset={4}
            className="isolate z-(--z-popup) outline-none"
          >
            <Autocomplete.Popup
              className={cn(
                choicePopupClassName,
                "max-h-[min(22rem,var(--available-height))] w-(--anchor-width) overflow-y-auto p-1",
              )}
            >
              {list}
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      )}
    </Autocomplete.Root>
  );
}
