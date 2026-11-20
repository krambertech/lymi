import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Reporter, TestModule } from "vitest/node";

const root = fileURLToPath(new URL("../../../..", import.meta.url));

/**
 * Writes the tests that failed and then passed on CI's retry, so the run summary and the flaky
 * issues can name them rather than count a green run. docs/testing.md#flaky-tests.
 */
export class FlakyReporter implements Reporter {
  constructor(private readonly output: string) {}

  onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    const flaky = [];
    for (const testModule of testModules) {
      for (const testCase of testModule.children.allTests()) {
        if (!testCase.diagnostic()?.flaky) continue;
        const error = testCase.result().errors?.[0]?.message?.split("\n")[0];
        flaky.push({
          file: relative(root, testModule.moduleId),
          title: testCase.fullName,
          project: testCase.project.name,
          error: error?.slice(0, 300),
        });
      }
    }
    const path = resolve(this.output);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(flaky, null, 2)}\n`);
  }
}
