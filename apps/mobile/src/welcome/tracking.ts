import type { AnalyticsName, AnalyticsProperties } from "@lymi/core/analytics";
import { useEffect, useRef } from "react";
import { captureEvent } from "../telemetry/posthog";

// Welcome's and the guide's steps, counted as the web counts them (docs/analytics.md): each step is
// viewed and finished at most once per launch until Welcome ends, so Back and Continue again repeat
// nothing. Every phone event carries `surface=phone`, which tells the two apps apart.

type Step = AnalyticsProperties<"welcome_step_viewed">["step_name"];
type Option = AnalyticsProperties<"empty_state_option_picked">["option"];

const viewed = new Set<Step>();
const finished = new Set<Step>();

/** Analytics wait for the account's settings, so an event refused that early is tried again. */
function captureSoon<N extends AnalyticsName>(name: N, properties: AnalyticsProperties<N>) {
  if (captureEvent(name, properties)) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (captureEvent(name, properties)) {
        clearInterval(timer);
        resolve(true);
      } else if (tries >= 10) {
        clearInterval(timer);
        resolve(false);
      }
    }, 1000);
  });
}

export function viewStep(step: Step) {
  if (viewed.has(step)) return;
  viewed.add(step);
  void captureSoon("welcome_step_viewed", { step_name: step, skipped: false }).then((sent) => {
    if (!sent) viewed.delete(step);
  });
}

export function finishStep(step: Step, skipped: boolean) {
  if (finished.has(step)) return;
  finished.add(step);
  void captureSoon("welcome_step_finished", { step_name: step, skipped });
}

/** Once Welcome is finished or skipped, so a later Welcome in this launch counts afresh. */
export function endWelcome() {
  viewed.clear();
  finished.clear();
}

/** An explicit choice of how to start, from Welcome or the guide. */
export function trackGuide(option: Option) {
  void captureSoon("empty_state_option_picked", { option });
}

const GUIDE: Step[] = ["deck", "cards", "review"];

/**
 * The guide's current step is viewed, and a step the learner moves past while it shows is finished.
 * Progress already made when the guide mounts is not replayed as finishing; `deck` is finished by
 * the server on the account's first deck and `review` on the first grade.
 */
export function useGuideSteps(current: number) {
  const seen = useRef<number | null>(null);
  useEffect(() => {
    const previous = seen.current;
    if (previous === current) return;
    if (previous !== null && current > previous) {
      const done = GUIDE[previous];
      // The server finishes `deck` when the account gets its first deck, wherever that happens.
      if (done && done !== "deck")
        void captureSoon("welcome_step_finished", { step_name: done, skipped: false });
    }
    const now = GUIDE[current];
    if (now) void captureSoon("welcome_step_viewed", { step_name: now, skipped: false });
    seen.current = current;
  }, [current]);
}
