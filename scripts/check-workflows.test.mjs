import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED, check, parseExpression, workflowProblems } from "./check-workflows.mjs";

const problems = (source, file = "x.yml", allowed = []) => workflowProblems(file, source, allowed);

function job({ on = "workflow_dispatch", condition, permissions = "contents: read", steps } = {}) {
  return `
on: ${on}
jobs:
  release:
    ${condition ? `if: ${condition}` : "timeout-minutes: 5"}
    permissions:
      ${permissions}
    steps: ${steps ?? "[{ env: { TOKEN: '${{ secrets.TOKEN }}' }, run: ./release.sh }]"}
`;
}

test("every workflow in the repository passes", () => {
  assert.deepEqual(check(), []);
});

test("rejects the desktop release from #967, and passes it once fixed", () => {
  const before = `
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  release:
    if: github.event_name != 'pull_request'
    permissions:
      contents: read
    env:
      MAC_CERTIFICATE_P12: \${{ secrets.MAC_CERTIFICATE_P12 }}
    steps:
      - run: pnpm make
`;
  assert.deepEqual(problems(before, "desktop.yml"), [
    ".github/workflows/desktop.yml: secrets.MAC_CERTIFICATE_P12 is in the `env` of job release, so every action and script in it can read it; set it in the `env` of the step that needs it (#967)",
    ".github/workflows/desktop.yml: job release holds secrets.MAC_CERTIFICATE_P12 and can run by hand on any branch (workflow_dispatch); add `github.ref == 'refs/heads/main'` to the job's `if`, or to the job it needs (#967, #1011)",
  ]);
  const after = `
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  release:
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
    steps:
      - run: pnpm make
        env:
          MAC_CERTIFICATE_P12: \${{ secrets.MAC_CERTIFICATE_P12 }}
`;
  assert.deepEqual(problems(after), []);
});

test("rejects the nightly report from #1011, which a branch run reached", () => {
  const nightly = (condition) => `
on:
  schedule: [{ cron: "17 2 * * *" }]
  workflow_dispatch:
jobs:
  drive:
    permissions: { contents: read }
    steps: []
  report:
    needs: drive
    if: \${{ ${condition} }}
    permissions: { contents: read, issues: write }
    steps: []
`;
  const [problem, ...rest] = problems(nightly("!cancelled()"));
  assert.match(problem, /job report holds issues: write and can run by hand on any branch/);
  assert.deepEqual(rest, []);
  assert.deepEqual(problems(nightly("!cancelled() && github.ref == 'refs/heads/main'")), []);
});

test("rejects the summary job from #1205, which wrote issues on every pull request", () => {
  const summary = (condition) => `
on:
  pull_request:
  push: { branches: [main] }
jobs:
  check:
    if: \${{ ${condition} }}
    permissions: { issues: write }
    steps: []
`;
  const [problem, ...rest] = problems(summary("always()"));
  assert.match(problem, /job check holds issues: write and can run on any pull request/);
  assert.deepEqual(rest, []);
  assert.deepEqual(
    problems(summary("always() && github.event_name == 'push' && github.ref == 'refs/heads/main'")),
    [],
  );
});

test("a condition pins a job only when every way through it does", () => {
  const passes = [
    "github.ref == 'refs/heads/main'",
    "\"${{ github['ref'] == 'refs/heads/main' }}\"",
    "github.ref == 'refs/heads/main' && (inputs.dry == 'true' || inputs.dry == 'false')",
    "\"!(github.ref != 'refs/heads/main')\"",
    "github.event_name == 'schedule'",
  ];
  for (const condition of passes) assert.deepEqual(problems(job({ condition })), [], condition);

  const fails = [
    "github.ref == 'refs/heads/main' || inputs.force == 'true'",
    "github.event_name == 'workflow_dispatch' || github.ref == 'refs/heads/main'",
    "github.ref != 'refs/heads/main'",
    "startsWith(github.ref, 'refs/heads/')",
    '"${{ github.ref }} == refs/heads/main"',
  ];
  for (const condition of fails) assert.equal(problems(job({ condition })).length, 1, condition);
});

test("another branch's name does not pin a job, since a run can start from it", () => {
  for (const on of ["workflow_dispatch", "push", "pull_request"]) {
    const named = [
      "github.ref == 'refs/heads/dev'",
      "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev'",
      "github.ref == 'refs/tags/v1'",
      "github.ref == 'refs/pull/1/merge'",
      "github.ref != 'refs/heads/dev'",
      "github.ref != 'refs/heads/main'",
      "github.ref_name == 'dev'",
      "github.ref_name != 'main'",
      "github.base_ref == 'main'",
      "github.head_ref == 'main'",
      "github.head_ref == 'release'",
      "startsWith(github.ref, 'refs/heads/release')",
      "contains(github.ref, 'release')",
      "endsWith(github.ref_name, '-release')",
      "format('refs/heads/{0}', 'dev') == github.ref",
      "github.ref == github.event.inputs.ref",
      "(inputs.ref || github.ref) == 'refs/heads/main'",
      "github.ref",
    ];
    for (const condition of named)
      assert.equal(problems(job({ on, condition })).length, 1, `${on}: ${condition}`);

    const pinned = [
      "github.ref == 'refs/heads/main'",
      "\"'refs/heads/main' == github.ref\"",
      "github.ref == 'REFS/HEADS/MAIN'",
      "github.ref_name == 'main'",
      "\"!(github.ref_name != 'main')\"",
      "github.ref == 'refs/heads/dev' && github.ref_name == 'main'",
    ];
    for (const condition of pinned)
      assert.deepEqual(problems(job({ on, condition })), [], `${on}: ${condition}`);
  }
});

test("naming one outsider does not pin a job to the people who may run it", () => {
  const cases = [
    ["pull_request", "github.event.pull_request.head.repo.full_name == 'someone/lymi'"],
    ["pull_request_target", "github.event.pull_request.author_association == 'CONTRIBUTOR'"],
    ["issue_comment", "github.event.comment.author_association != 'NONE'"],
    ["workflow_run", "github.event.workflow_run.event == 'workflow_dispatch'"],
  ];
  for (const [on, condition] of cases)
    assert.equal(problems(job({ on, condition })).length, 1, condition);
});

test("an environment does not pin a job, since neither environment is limited to main", () => {
  const source = job().replace("    steps:", "    environment: app-preview\n    steps:");
  assert.equal(problems(source).length, 1);
});

test("a job that needs a pinned job is pinned, unless it runs whatever happened to it", () => {
  const chain = (condition) => `
on: workflow_dispatch
permissions: { contents: read }
jobs:
  plan:
    if: github.ref == 'refs/heads/main'
    steps: []
  smoke:
    needs: [plan]
    steps: []
  promote:
    needs: smoke
    ${condition}
    permissions: { contents: write }
    steps: []
`;
  assert.deepEqual(problems(chain("if: needs.smoke.outputs.ok == 'true'")), []);
  assert.equal(problems(chain("if: always()")).length, 1);
  assert.equal(problems(chain("if: ${{ !cancelled() }}")).length, 1);
});

test("a secret in a step that only main reaches is pinned, a write permission is not", () => {
  const steps =
    "[{ if: github.ref == 'refs/heads/main', env: { T: '${{ secrets.T }}' }, run: ./x.sh }]";
  assert.deepEqual(problems(job({ steps })), []);
  assert.equal(problems(job({ steps, permissions: "packages: write" })).length, 1);
});

test("a pull request, a comment and a finished run need a guard on who started them", () => {
  const main = "github.ref == 'refs/heads/main'";
  const cases = [
    ["pull_request", "github.event.pull_request.head.repo.full_name == github.repository"],
    ["pull_request_target", "github.event.pull_request.head.repo.full_name == github.repository"],
    ["issue_comment", "github.event.comment.author_association == 'OWNER'"],
    ["workflow_run", "github.event.workflow_run.event == 'push'"],
  ];
  for (const [on, condition] of cases) {
    assert.equal(problems(job({ on })).length, 1, on);
    assert.deepEqual(problems(job({ on, condition })), [], on);
    const pinned = problems(job({ on, condition: main })).length;
    assert.equal(pinned, on === "pull_request" ? 0 : 1, on);
  }
});

test("a push is safe only when it is limited to main", () => {
  assert.deepEqual(problems(job({ on: "{ push: { branches: [main] } }" })), []);
  for (const on of ["push", "{ push: { branches: [main, next] } }", "{ push: { tags: ['v*'] } }"])
    assert.equal(problems(job({ on })).length, 1, on);
});

test("counts inherited, indexed and whole-context secrets, and not the workflow's own token", () => {
  const call = (secrets) => `
on: workflow_dispatch
permissions: { contents: read }
jobs:
  call:
    uses: ./.github/workflows/phone.yml
    secrets: ${secrets}
`;
  assert.match(problems(call("inherit"))[0], /secrets: inherit/);
  assert.match(problems(call("{ KEY: \"${{ secrets['EXPO_TOKEN'] }}\" }"))[0], /EXPO_TOKEN/);
  assert.match(problems(call('{ KEY: "${{ toJSON(secrets) }}" }'))[0], /secrets\.\*/);
  assert.deepEqual(problems(call('{ KEY: "${{ secrets.GITHUB_TOKEN }}" }')), []);
});

test("rejects a secret in the workflow's env", () => {
  const source = `
on: schedule
env: { TOKEN: "\${{ secrets.TOKEN }}" }
permissions: { contents: read }
jobs: { release: { steps: [] } }
`;
  assert.match(problems(source)[0], /secrets\.TOKEN is in the workflow's `env`/);
});

test("rejects a job with no permissions of its own or its workflow's", () => {
  const [problem] = problems("on: schedule\njobs: { sweep: { steps: [] } }");
  assert.match(problem, /job sweep has no `permissions`/);
  assert.deepEqual(problems("on: schedule\npermissions: {}\njobs: { sweep: { steps: [] } }"), []);
});

test("rejects event, input and branch text written into a script", () => {
  const scripts = [
    "node check.mjs '${{ github.event.pull_request.title }}'",
    "git switch ${{ github.head_ref }}",
    "echo ${{ inputs.group }} ${{ github.sha }}",
    "echo ${{ toJSON(github.event) }}",
    "echo ${{ format('{0}', github.event['inputs'].group) }}",
  ];
  for (const run of scripts) {
    const steps = JSON.stringify([{ run }]);
    const found = problems(job({ on: "schedule", steps }));
    assert.equal(found.length, 1, run);
    assert.match(found[0], /pass it through the step's `env`/);
  }
  const safe = JSON.stringify([
    { env: { GROUP: "${{ inputs.group }}" }, run: 'echo "$GROUP" ${{ github.sha }}' },
  ]);
  assert.deepEqual(problems(job({ on: "schedule", steps: safe })), []);
});

test("an exception covers one job and trigger, and must still be needed", () => {
  const allowed = [{ file: "x.yml", job: "release", trigger: "workflow_dispatch", reason: "r" }];
  assert.deepEqual(problems(job(), "x.yml", allowed), []);
  assert.equal(problems(job({ on: "issue_comment" }), "x.yml", allowed).length, 2);
  assert.match(
    problems(job({ condition: "github.ref == 'refs/heads/main'" }), "x.yml", allowed)[0],
    /no longer needs its workflow_dispatch exception/,
  );
  for (const entry of ALLOWED) assert.ok(entry.reason.length > 40, entry.job);
});

test("refuses an expression it cannot read rather than passing it", () => {
  assert.throws(() => parseExpression("github.ref == "), /cannot read/);
  assert.throws(() => parseExpression("a ? b : c"), /cannot read/);
});
