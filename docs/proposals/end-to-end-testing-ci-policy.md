---
status: exploration
date: 2026-09-06
decision: none
---

# End-to-end testing CI policy

This document preserves a preferred direction for making Lymi's end-to-end test feedback faster and less expensive while keeping cross-browser coverage. It is not an accepted CI decision or an implementation plan.

## Current position

Lymi currently runs formatting and lint checks, a production build, typechecking, unit tests, and the complete Playwright suite in one GitHub Actions job. Product-affecting pull requests run twelve tests serially across Chromium desktop and an iPhone-sized WebKit project. Pushes to `main` and manually dispatched runs use the same full suite.

This arrangement is simple and shares one checkout and dependency installation. It was appropriate when the E2E suite contained one small journey. The suite now covers the complete learning flow plus deck and card creation, and browser execution has become the largest part of the CI job.

The successful run for pull request 24 took approximately 3 minutes 43 seconds from job start to completion. The base verification step took about 50 seconds, browser installation about 37 seconds, and the serial Chromium and WebKit E2E run about 2 minutes. These measurements are one observed run rather than a durable performance baseline.

## Goals

- Keep the automatic pull-request gate fast and cost-conscious.
- Catch the most likely product regressions before merge.
- Preserve regular WebKit and mobile-browser coverage rather than silently dropping it.
- Keep a manual path for full cross-browser verification before a risky change is merged.
- Avoid duplicating CI setup unless parallelism produces a measured benefit worth its cost.
- Keep browser tests isolated from production data and credentials.

## Preferred policy to evaluate

### Pull requests

Run one CI job with fail-fast steps in increasing order of cost:

1. Install dependencies once.
2. Run formatting and lint checks.
3. Run typechecking.
4. Run unit tests.
5. Run the production build.
6. When production-affecting paths changed, install Chromium and run the Chromium Playwright project.

The steps should remain in one job initially. Separate sequential jobs would repeat checkout, Node, pnpm, and dependency setup without reducing wall-clock time. Named steps can still make failures clear in the GitHub interface.

Chromium would be the only automatic pull-request browser. The existing responsive checks would continue to exercise narrow and wide layouts, but they would not substitute for WebKit's engine and mobile-device behavior.

### Main branch

Every push to `main` should run the complete Chromium and WebKit suite. A WebKit-specific regression could therefore merge, but it would be detected immediately in the post-merge build rather than waiting for an occasional scheduled run.

A failing post-merge WebKit run needs prompt ownership. If failures are repeatedly discovered only after merge, the policy should be tightened by returning a focused WebKit smoke set or the full WebKit project to pull requests.

### Manual cross-browser verification

The existing `/e2e` command and manual workflow dispatch should run both Chromium and WebKit. This gives a reviewer or author an explicit pre-merge option for changes with meaningful Safari, mobile, PWA, navigation, caching, sheet, dialog, focus, or touch risk.

The workflow should state which browser policy it selected in the GitHub step summary so a green Chromium-only pull request cannot be mistaken for a full cross-browser result.

## Browser projects are not deployment environments

Chromium and WebKit are Playwright projects that can run against the same disposable local Lymi server. They do not need separate deployed applications or Cloudflare environments merely because they use different browser engines.

Separate CI jobs would give each browser an independent checkout and local D1 database, which can enable parallel execution and clearer check names. That is a performance option, not a correctness requirement. It also repeats setup and can increase total compute consumption, so it should be adopted only after measuring the single-job policy.

Within one full-suite run, browser projects still need isolated learner identities because they share the local D1 database. The current per-scenario, per-project, per-retry accounts preserve that isolation.

## Possible implementation shape

This is an implementation sketch, not accepted work:

- keep `pnpm test:e2e` as the full local, `main`, and manual command;
- add a clearly named Chromium-only command for automatic pull-request use;
- make browser installation and Playwright project selection depend on the GitHub event;
- keep `scripts/e2e-impact.mjs` as the production-change gate for pull requests;
- make `/e2e` dispatch the full suite regardless of the automatic pull-request policy;
- update `docs/testing.md` so local and CI commands have unambiguous coverage labels;
- retain screenshots, traces, and reports for actionable failures;
- measure several runs before considering parallel browser jobs, sharding, or browser-image changes.

## Trade-offs

| Choice | Benefit | Cost or risk |
| --- | --- | --- |
| Chromium only on pull requests | Lower browser runtime and installation cost | WebKit-specific failures may be found after merge |
| Full suite on every `main` push | Cross-browser regressions remain visible for every merged change | A failure no longer blocks that change from merging |
| One pull-request job | One checkout and dependency installation; straightforward fail-fast ordering | Verification and E2E cannot run concurrently |
| Manual full-suite command | Risky changes can receive stronger pre-merge evidence | Coverage depends on someone recognizing and invoking the higher-risk path |
| Responsive assertions in Chromium | Retains inexpensive narrow and wide layout checks | Does not reproduce the WebKit engine, iPhone user agent, or touch capabilities |

## Changes deliberately deferred

- Do not remove WebKit from the repository or make it an infrequent best-effort check.
- Do not create separate deployed Lymi environments for each browser.
- Do not split every verification command into its own CI job before measuring the simpler policy.
- Do not cache Playwright browser binaries by default; Playwright notes that restoring the cache can cost about as much as downloading it and does not avoid installing operating-system dependencies.
- Do not add more retries to make intermittent tests appear green.
- Do not replace behavioral assertions with broad screenshot snapshots merely to increase coverage counts.

## Evidence to collect

Evaluate the policy over enough runs to avoid optimizing around one CI sample:

- median and slowest pull-request CI duration;
- browser installation and E2E duration separately;
- total GitHub Actions minutes per pull request;
- Chromium and WebKit retry or flake rate;
- number of WebKit failures found on `main` that would have blocked a pull request;
- frequency with which `/e2e` is invoked before merge;
- developer time from a failed check to an actionable diagnosis.

The policy is successful if pull-request feedback becomes materially faster or cheaper without a recurring pattern of WebKit regressions reaching `main`.

## Questions before deciding

1. Should the base commands remain one `pnpm verify` step, or become separately named steps within the same job for clearer failure reporting?
2. Should every push to `main` run WebKit, or is a scheduled full-suite run sufficient if merge volume becomes high?
3. Which changes, if any, should automatically request WebKit before merge rather than relying on `/e2e`?
4. What pull-request duration or Actions-minute reduction would justify the policy change?
5. How many post-merge WebKit failures would make Chromium-only pull-request coverage unacceptable?

## Sources checked

- [GitHub Actions run for pull request 24](https://github.com/krambertech/lymi/actions/runs/34038954064)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Playwright parallelism](https://playwright.dev/docs/test-parallel)
- [Playwright CI guidance](https://playwright.dev/docs/ci)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
