import type { Bindings } from "./env";
import { failureFields, log } from "./log";
import { reportServerException } from "./posthog";

export class JobFailed extends Error {
  override name = "JobFailed";
}

export function job(env: Bindings, name: string, work: Promise<unknown>): Promise<unknown> {
  return work.catch(async (error: unknown) => {
    await reportServerException(env, error, { route: `cron/${name}`, method: "CRON" });
    if (error instanceof JobFailed) throw error;
    const failure = failureFields(error);
    log.error("cron_job_failed", { route: `cron/${name}`, error });
    throw new JobFailed(
      `cron/${name} failed: ${[failure.error, failure.code].filter(Boolean).join(" ")}`,
    );
  });
}
