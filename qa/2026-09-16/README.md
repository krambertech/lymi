# Exploratory QA, 16 September 2026

An exploratory pass over the product before signups open, run against build `9b08004`.

`report.html` is the findings, `evidence/` holds the screenshot behind each one, and `scripts/` holds the Playwright drivers that produced them. Thirty-two findings: six to fix before signups, eighteen that mislead, eight polish and accessibility. The same report is published at https://claude.ai/artifact/WwQmv9tJUeApXLjjPUsQ7a.

Coverage: the `fresh`, `learner`, `streak`, `backlog`, `long` and `polyglot` personas plus two accounts built from nothing through the interface; 320, 390, 768, 1280 and 1920 px; light and dark; English and Ukrainian. Nothing threw, no request failed, and no screen scrolled sideways.

## Running it again

Start the product on port 5241, then run a driver from the repository root:

```bash
pnpm --filter @lymi/web dev --port 5241
node qa/2026-09-16/scripts/matrix.mjs '[{"persona":"learner","vp":"laptop","theme":"light"}]'
node qa/2026-09-16/scripts/after-done-add.mjs    # LY-02
node qa/2026-09-16/scripts/deck404.mjs           # LY-04
node qa/2026-09-16/scripts/offline.mjs           # LY-05
node qa/2026-09-16/scripts/mismatch.mjs          # LY-07, LY-08
node qa/2026-09-16/scripts/lowdata.mjs           # LY-09 to LY-12
node qa/2026-09-16/scripts/a11y.mjs              # LY-30
```

`scripts/lib.mjs` holds the viewports, the persona sign-in and the capture helpers, and writes screenshots to the session scratchpad. It launches the pre-installed Chromium at `/opt/pw-browsers/chromium`; change `EXEC` for another machine.

This directory is a record of one pass, not part of the product. It is kept on its own branch so the evidence survives the session that produced it; it is not meant for `main`.
