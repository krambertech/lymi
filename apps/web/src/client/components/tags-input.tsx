import { useLingui } from "@lingui/react/macro";
import { cn } from "cn";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldControl } from "./ui/field";
import { controlBase, controlText } from "./ui/input";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string | undefined;
}

/** Tags typed one at a time: Enter or a comma adds one, Backspace on an empty field takes the last back. */
export function TagsInput({ value, onChange, placeholder }: Props) {
  const { t } = useLingui();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const control = useFieldControl({});

  // A pasted "streets, signs" is two tags.
  const add = (raw: string) => {
    setDraft("");
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = part.trim();
      if (tag && !next.includes(tag)) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a click on the box's padding lands in its field.
    // biome-ignore lint/a11y/useKeyWithClickEvents: the field inside takes the keyboard.
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) inputRef.current?.focus();
      }}
      className={cn(
        controlBase,
        "flex min-h-11 cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 md:min-h-10",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring",
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
            onClick={() => {
              onChange(value.filter((v) => v !== tag));
              inputRef.current?.focus();
            }}
            aria-label={t`Remove the tag ${tag}`}
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hoverable:hover:bg-hover hoverable:hover:text-text"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        {...control}
        value={draft}
        autoComplete="off"
        enterKeyHint="enter"
        placeholder={value.length ? undefined : placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) add(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          // Enter with a tag typed adds it; with nothing typed it submits the form as usual.
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        className={cn(
          controlText,
          "h-7 min-w-24 flex-1 bg-transparent px-1.5 text-text outline-none placeholder:text-muted",
        )}
      />
    </div>
  );
}
