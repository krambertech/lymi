# Visual evidence for UI PRs

Capture screenshots when they materially help a reviewer understand a user-visible change. Evidence should be proportional to the affected experience, not a fixed matrix.

## Choose the evidence

- Show before and after when an existing surface changed enough for comparison to matter; show only after for a new surface.
- Cover the viewports, themes, and states the change can affect. Do not capture unaffected combinations merely to fill a table.
- Use local or sanitized data. Keep private content, tokens, email addresses, account identifiers, and production data out of screenshots and filenames.

## Capture and attach

- Use the available browser or visual-verification tools to reach the real state and save image files.
- Prefer a supported attachment mechanism. Do not expose credentials or depend on undocumented upload endpoints.
- If the runtime cannot attach images, hand the files to the user with clear labels and state that they are not attached.
- After attachment, fetch or inspect the PR body and confirm that every image renders in the intended place.
