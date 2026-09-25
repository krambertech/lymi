import { useLingui } from "@lingui/react/macro";
import { cn } from "cn";
import { X } from "lucide-react";
import { type FocusEvent, type Ref, useImperativeHandle, useRef, useState } from "react";
import { useField, useFieldControl } from "./ui/field";
import { controlBase, controlText } from "./ui/input";

interface Props {
  value: string[];
  onValueChange: (tags: string[]) => void;
  placeholder?: string | undefined;
  /** Posts each tag under this name with a native form. */
  name?: string | undefined;
  onBlur?: ((event: FocusEvent<HTMLInputElement>) => void) | undefined;
  disabled?: boolean | undefined;
  /** The text field inside the box. */
  ref?: Ref<HTMLInputElement> | undefined;
}

/** Tags typed one at a time: Enter or a comma adds one, Backspace on an empty field takes the last back. */
export function TagsInput({
  value,
  onValueChange,
  placeholder,
  name,
  onBlur,
  disabled,
  ref,
}: Props) {
  const { t } = useLingui();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
  const control = useFieldControl({});
  const field = useField();
  const off = disabled || field?.disabled || false;

  // A pasted "streets, signs" is two tags.
  const add = (raw: string) => {
    setDraft("");
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = part.trim();
      if (tag && !next.includes(tag)) next.push(tag);
    }
    if (next.length !== value.length) onValueChange(next);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a click on the box's padding lands in its field.
    // biome-ignore lint/a11y/useKeyWithClickEvents: the field inside takes the keyboard.
    <div
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
      <input
        ref={inputRef}
        {...control}
        value={draft}
        disabled={off}
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
  );
}
