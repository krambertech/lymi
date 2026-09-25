# Review report format

Use these four sections in order. A one-line copy or token change gets a one-line verdict, `No actionable findings.`, its coverage cells, and the checks run.

## Verdict

Write exactly one of `Blocked`, `Changes needed`, or `Ship it`, followed by one sentence grounded in the highest-impact finding or the sufficiency of the evidence.

## Findings

Order findings by learner impact, then reach. Use one subsection per root cause and include:

- severity: `Critical`, `Major`, or `Minor`;
- status: `Introduced` or `Regression`;
- exact source or rendered location;
- specific evidence;
- learner impact;
- a practical, proportionate fix.

Findings must be caused or activated by the reviewed change. Consolidate repeated symptoms at the owning token, component, or handler. Write `No actionable findings.` when there are none.

If an unrelated pre-existing issue is essential context, place it under `Pre-existing, outside the verdict`, explain why the change did not cause it, and keep it out of the verdict. Do not turn the section into a backlog.

## Coverage

List each coverage cell the tree in `SKILL.md` selected, with the diff and flow reviewed. Mark each cell `Observed` or `Not inspected` with the reason. Code inspection is not an observed cell.

## Verification

List the commands and runtime checks performed with their results. List anything relevant that was not verified, why, and what uncertainty remains.

Do not add numeric scores, personas, finding quotas, generic checklist transcripts, or separate domain reports. A passing command is evidence only for what it checks.
