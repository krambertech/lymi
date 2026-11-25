import { Trans, useLingui } from "@lingui/react/macro";
import { Clock, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../Button";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ExamTimer({ minutes }: { minutes: number }) {
  const { t } = useLingui();
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);

  const remaining = () => Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next = remaining();
      setLeft(next);
      if (next === 0) setRunning(false);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (running) {
      setLeft(remaining());
      setRunning(false);
      return;
    }
    deadline.current = Date.now() + left * 1000;
    setRunning(true);
  };

  const progress = Math.max(0, Math.min(100, (left / total) * 100));
  const announcement =
    left === 0
      ? t`Time is up. You can still finish and check your answers.`
      : left <= 300
        ? t`Five minutes remaining.`
        : "";

  return (
    <div className="grid gap-3 rounded-xl bg-plate p-4 ring-1 ring-edge">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clock aria-hidden="true" className="size-4.5 text-(--form)" />
          <span className="text-sm font-medium text-ink-secondary">
            <Trans>Exam timer</Trans>
          </span>
          <span className="text-xl font-semibold tracking-tight tabular-nums">
            {formatTime(left)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {left > 0 && (
            <Button variant="secondary" size="sm" onClick={toggle}>
              {running ? (
                <>
                  <Pause aria-hidden="true" data-icon="inline-start" />
                  <Trans>Pause</Trans>
                </>
              ) : (
                <>
                  <Play aria-hidden="true" data-icon="inline-start" />
                  {left < total ? <Trans>Resume</Trans> : <Trans>Start timer</Trans>}
                </>
              )}
            </Button>
          )}
          {left < total && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRunning(false);
                setLeft(total);
              }}
            >
              <RotateCcw aria-hidden="true" data-icon="inline-start" />
              <Trans>Reset</Trans>
            </Button>
          )}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-plate-nested">
        <div
          className="h-full rounded-full bg-(--form) transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {left === 0 && (
        <p className="text-sm text-ink-secondary">
          <Trans>Time is up. You can still finish and check your answers.</Trans>
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
