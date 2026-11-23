import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { Check, RotateCcw } from "lucide-react";
import { type ReactNode, useContext, useId, useRef, useState } from "react";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { LetterKeys, useLetters } from "./LetterKeys";
import { QuizCard } from "./Quiz";
import { PlayButton } from "./Sound";

export interface WritingProps {
  id: string;
  title: ReactNode;
  prompt: ReactNode;
  model: readonly string[];
  src?: string | undefined;
  checks: readonly { id: string; label: ReactNode }[];
}

type Step = "writing" | "checking" | "done";

export function Writing({ id, title, prompt, model, src, checks }: WritingProps) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const promptId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [empty, setEmpty] = useState(false);
  const [step, setStep] = useState<Step>("writing");
  const [ticked, setTicked] = useState<readonly boolean[]>(() => checks.map(() => false));
  const type = useLetters(field, value, setValue);
  const written = value.trim().length > 0;
  const right = ticked.filter(Boolean).length;

  const finish = () => {
    setStep("done");
    captureAnalytics("learn_quiz_finished", {
      lesson: slug,
      quiz: id,
      right,
      total: checks.length,
    });
    if (section) finishSection(section);
  };
  const again = () => {
    setStep("writing");
    setTicked(checks.map(() => false));
    requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
  };

  return (
    <QuizCard title={title}>
      <div id={promptId} className="text-md text-ink-secondary">
        {prompt}
      </div>
      {step === "writing" ? (
        <form
          className="grid w-full grid-cols-1 gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            setEmpty(!written);
            if (written) setStep("checking");
            else field.current?.focus();
          }}
        >
          <textarea
            ref={field}
            rows={4}
            lang="et"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setEmpty(false);
            }}
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t`Your text`}
            aria-describedby={promptId}
            placeholder={t`Your text`}
            className="learn-answer min-h-32 w-full resize-y rounded-tile border border-edge-strong bg-plate px-4 py-3 text-xl font-medium placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)"
          />
          <p role="status" className="min-h-5 text-sm text-ink-muted">
            {empty && <Trans>Write something first, then compare.</Trans>}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <LetterKeys onLetter={type} />
            <Button type="submit" variant="primary" size="lg" className="ms-auto">
              <Trans>Show the model</Trans>
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4">
          <div className="grid gap-1.5">
            <p className="text-sm text-ink-muted">
              <Trans>You wrote</Trans>
            </p>
            <p lang="et" className="text-lg whitespace-pre-wrap [overflow-wrap:anywhere]">
              {value}
            </p>
          </div>
          <div className="grid gap-1.5">
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Trans>A model answer</Trans>
              {src && <PlayButton src={src} label={t`Play the model answer`} />}
            </p>
            <p lang="et" className="text-lg font-medium">
              {model.join(" ")}
            </p>
          </div>
          <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
            <legend className="mb-1.5 text-md font-medium">
              <Trans>Tick what your text does.</Trans>
            </legend>
            {checks.map((check, i) => (
              <label
                key={check.id}
                className="flex cursor-pointer items-start gap-3 rounded-tile bg-plate px-1 py-1.5 text-md"
              >
                <input
                  type="checkbox"
                  checked={ticked[i] ?? false}
                  disabled={step === "done"}
                  onChange={(event) =>
                    setTicked((list) =>
                      list.map((each, j) => (j === i ? event.target.checked : each)),
                    )
                  }
                  className="mt-1 size-5 shrink-0 accent-(--form)"
                />
                <span>{check.label}</span>
              </label>
            ))}
          </fieldset>
          {step === "checking" ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="justify-self-start"
              onClick={finish}
            >
              <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
              <Trans context="button that ends the checklist">Done</Trans>
            </Button>
          ) : (
            <div className="grid gap-3">
              <p role="status" className="text-xl font-semibold">
                <Trans>
                  {right} of {checks.length} ticked
                </Trans>
              </p>
              <Button
                type="button"
                variant="secondary"
                className="justify-self-start"
                onClick={again}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                <Trans>Write it again</Trans>
              </Button>
            </div>
          )}
        </div>
      )}
    </QuizCard>
  );
}
