---
name: delete-comment
description: Delete source comments in a part of Lymi and lower the comment baseline. Use when asked to delete, clean up or audit comments, or when `pnpm check:comments` lists files to work through. Sorts each comment into tautology, stale, excuse or decision record, files issues for excuses and moves decision records into docs or ADRs.
---

# Delete comments

[CODING_STANDARDS.md](../../../CODING_STANDARDS.md#write-no-comments) owns the rule: source files carry no comments, and `scripts/comment-baseline.json` holds the comment lines each file may still have. This skill takes one scope down to zero.

## Pick the scope

Use the path the caller names. Without one, take the directory with the most lines left in the baseline that no open pull request touches:

```bash
node -e 'const b=require("./scripts/comment-baseline.json");const d={};for(const[f,n]of Object.entries(b)){const k=f.split("/").slice(0,3).join("/");d[k]=(d[k]??0)+n}console.log(Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,15))'
gh pr list --state open --json number,files --jq '.[] | [.number, (.files[].path)] | @tsv'
```

Keep one pull request under about 60 files. List the comments with `node scripts/check-comments.mjs --list <path>`; tool directives (`oxlint-disable-next-line`, `@ts-expect-error`, `/// <reference>`, `/** @type {…} */`) are already left out and stay. Above 20 files, hand each directory to its own subagent with this skill's sorting rules. The subagent deletes comments and returns one row per comment: file, line, category, text, and one line of why. Write the docs and issues yourself from the rows, so one hand owns where each decision lands.

## Sort each comment

Read the code around it before judging. Walk this tree; the first match wins:

```
Does it name a symbol, file, number or behaviour the code no longer has?
├── Yes → stale
└── No
    ├── Does it only restate the name, type, signature or next line? → tautology
    ├── Does it defend a workaround in our own code that a rename, extraction, type or redesign would remove? → excuse
    ├── Does it record a choice or an outside constraint (platform, vendor, protocol, browser, store review) a reader needs? → decision record
    └── Unsure after reading the code → tautology
```

A constraint from Electron, iOS, Workers, D1, a vendor's API or a spec is a decision record, never an excuse: we cannot reshape it. A surprise in our own code is an excuse: the code should stop being surprising. `IMPORTANT`, `do not remove` and long justifications are a reason to read further, not a verdict.

Every comment ends deleted. The category decides what else happens:

- **Tautology or stale.** Delete it.
- **Excuse.** Delete it and file one issue per workaround. Search first with `gh issue list --search "<symbol>" --state all`. Title the issue with the fix, not the symptom; the body names the file and symbol, quotes the deleted comment, and says what shape removes the workaround. Label it `type: chore` and the area label for its app.
- **Decision record.** Delete it and move the decision where the repository keeps it. A decision that is hard to reverse, surprising and the result of a real trade-off gets a new ADR or a sentence in the existing ADR that owns it, following [the ADR guide](../../../docs/adr/README.md). Everything else, such as a platform quirk or an operating fact, goes in the owning doc: the app's README or `AGENTS.md`, or the document [PRODUCT.md](../../../PRODUCT.md#features) names. Group several decisions about one module into one section, and name the code it covers so a reader can find it. A decision a test could pin goes in the issue as a test to write.

Change comments and docs only. A rename, extraction or test that would make the code say what the comment said is an issue, so the deletion pull request stays easy to review.

## Finish

Done means `node scripts/check-comments.mjs --list <path>` prints nothing.

```bash
pnpm exec oxfmt <path>
node scripts/check-comments.mjs --update
pnpm verify:changed
```

`--update` lowers the baseline for every file whose count fell; never raise it by hand. Open the pull request with [open-pr](../open-pr/SKILL.md). Its description gives the count per category, the lines removed, each issue filed and each doc or ADR that took a decision.
