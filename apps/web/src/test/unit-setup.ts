import { afterAll, vi } from "vitest";

/**
 * The unit project runs its files in one worker without isolation, so `test-db.ts` can keep one
 * local runtime for all of them on `globalThis`. Everything else starts clean: the module registry
 * is emptied before each file loads, so a mocked module belongs to the file that mocked it, and a
 * stubbed global does not reach the next one.
 */
vi.resetModules();

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
