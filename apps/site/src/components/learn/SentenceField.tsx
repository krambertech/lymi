import type { RefObject } from "react";

const BOX =
  "col-start-1 row-start-1 min-h-13 min-w-0 px-4 py-3 text-xl font-medium whitespace-pre-wrap [overflow-wrap:anywhere]";

interface Props {
  ref: RefObject<HTMLTextAreaElement | null>;
  value: string;
  label: string;
  describedBy?: string | undefined;
  onChange: (value: string) => void;
  onEnter: () => void;
}

export function SentenceField({ ref, value, label, describedBy, onChange, onEnter }: Props) {
  return (
    <div className="grid w-full grid-cols-1">
      <div aria-hidden="true" className={`${BOX} invisible border`}>
        {`${value} `}
      </div>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, " "))}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          onEnter();
        }}
        lang="et"
        inputMode="text"
        enterKeyHint="done"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        aria-describedby={describedBy}
        placeholder={label}
        className={`${BOX} learn-answer w-full resize-none overflow-hidden rounded-tile border border-edge-strong bg-plate placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)`}
      />
    </div>
  );
}
