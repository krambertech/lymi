# Implementation plans

One file per accepted outcome that needs several coordinated changes. A plan translates an owning product document, design rule, or ADR into executable work; it does not reopen or repeat the decision.

## Writing a plan

- Title the plan with the intended outcome. Open with its status, scope, and links to the owning decisions in no more than three sentences.
- Define `Done when` as observable behavior and required verification before listing steps.
- Order steps by dependency. Each step states the change, its completion criterion, and any dependency that is not already obvious.
- Prefer fewer than ten steps. Split phases only when each produces an independently verifiable state.
- Include risks, rollout, migration, or recovery only when they change the work or its completion criteria.
- Keep unresolved choices explicit and return them to the owning proposal or decision. Do not hide a product or architecture decision inside an implementation step.
- Track progress with a short status or checkboxes. Keep session notes, test logs, implementation recaps, and file-by-file narration out of the plan.

Aim for fewer than 1,000 words. On completion, record the completion date and any remaining follow-up once; the pull request and history retain the implementation story.
