import { useState } from "react";
import { formText, turn } from "../../lib/learn/forms";
import { MorphLetters } from "./Morph";

interface Props {
  form: string;
  before?: string | undefined;
  className?: string | undefined;
}

export function Turning({ form, before, className }: Props) {
  const [change, setChange] = useState({ from: form, to: form });
  if (change.to !== form) setChange({ from: change.to, to: form });
  const { from, to } = change;
  return (
    <span lang="et" className={className}>
      <span className="sr-only">
        {before}
        {formText(to)}
      </span>
      <span
        key={`${from} ${to}`}
        aria-hidden="true"
        data-play={from === to ? undefined : ""}
        className="learn-turn whitespace-nowrap"
      >
        <MorphLetters parts={turn(from, to)} />
      </span>
    </span>
  );
}
