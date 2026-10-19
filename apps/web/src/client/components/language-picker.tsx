import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxList,
  ComboboxTrigger,
} from "./ui/combobox";

export interface LanguageChoice {
  value: string;
  /** The language in the app's language, or a kind of deck. */
  label: string;
  /** How it reads inside a sentence, where that differs from the label: "anything", "tests". */
  inline?: string | undefined;
  count: number;
}

/** Whether a language matches what the learner typed: its name here, its own name, or its code. */
export function matchesLanguage(code: string, label: string, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  let own = "";
  try {
    own = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? "";
  } catch {}
  return [label, own, code].some((s) => s.toLocaleLowerCase().includes(q));
}

interface Props {
  choices: LanguageChoice[];
  value: string;
  /** `searched` when the choice came from typing in the list's search. */
  onChange: (value: string, searched: boolean) => void;
}

/** The choice as words inside a sentence, opening a searchable list so any size of catalogue fits. */
export function LanguagePicker({ choices, value, onChange }: Props) {
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const shown = choices.filter((c) => matchesLanguage(c.value, c.label, query));
  const chosen = choices.find((c) => c.value === value) ?? null;
  return (
    <Combobox<LanguageChoice>
      items={choices}
      filteredItems={shown}
      value={chosen}
      onValueChange={(next) => next && onChange(next.value, query.trim() !== "")}
      isItemEqualToValue={(a, b) => a.value === b.value}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
    >
      <ComboboxTrigger
        look="chip"
        // The label replaces the trigger's text, so it carries the choice too.
        aria-label={t`What the decks are about: ${chosen?.label ?? ""}`}
        className={
          "group inline-flex cursor-pointer items-center gap-0.5 rounded-xs align-baseline text-[length:inherit] font-[inherit] text-text " +
          "transition-colors duration-150 ease-out hoverable:hover:text-amber-text data-[popup-open]:text-amber-text " +
          "outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-ring"
        }
      >
        {/* Every state stays inside the word, so nothing spills onto the words beside it. */}
        <span className="underline decoration-amber decoration-[1.5px] underline-offset-[5px] transition-[text-decoration-thickness] duration-150 group-hover:decoration-2 group-focus-visible:decoration-2 group-data-[popup-open]:decoration-2">
          {chosen?.inline ?? chosen?.label}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-text-2 transition-[rotate,color] duration-200 ease-out group-hover:text-amber-text group-data-[popup-open]:rotate-180 group-data-[popup-open]:text-amber-text motion-reduce:transition-none"
          aria-hidden="true"
        />
      </ComboboxTrigger>
      <ComboboxContent aria-label={t`What the decks are about`} className="min-w-64">
        <ComboboxInput placeholder={t`Search languages`} />
        <ComboboxEmpty>
          <Trans>No ready-made decks in that language yet.</Trans>
        </ComboboxEmpty>
        <ComboboxList>
          {(c: LanguageChoice) => (
            <ComboboxItem key={c.value} value={c}>
              <span className="flex-1 truncate">{c.label}</span>
              <ComboboxItemHint>
                <Plural value={c.count} one="# deck" other="# decks" />
              </ComboboxItemHint>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
