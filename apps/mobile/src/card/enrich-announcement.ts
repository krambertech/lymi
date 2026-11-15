type Status = string | null | undefined;

/** Which parts of a run the page saw working, so a stale status from an older run is not its outcome. */
export interface EnrichRun {
  fill: boolean;
  translation: boolean;
}

/**
 * What a card's page says aloud as its statuses change: the start once, then how the run settled.
 * A fill can fail while its translation still runs, so the run settles when neither is working.
 */
export function enrichAnnouncement(
  run: EnrichRun | null,
  status: Status,
  translationStatus: Status,
) {
  const fill = status === "working";
  const translation = translationStatus === "working";
  if (fill || translation) {
    return {
      run: { fill: fill || !!run?.fill, translation: translation || !!run?.translation },
      say: run ? null : ("started" as const),
    };
  }
  if (!run) return { run: null, say: null };
  const failed =
    (run.fill && status === "failed") || (run.translation && translationStatus === "failed");
  return { run: null, say: failed ? ("failed" as const) : ("done" as const) };
}
