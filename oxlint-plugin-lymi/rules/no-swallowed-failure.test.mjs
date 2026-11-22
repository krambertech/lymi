import { testRule } from "../test/run.mjs";

const filename = "pull.ts";

testRule("no-swallowed-failure", {
  message:
    "This drops the error, so nobody learns why the work failed (#896, #941, #1091). Rethrow it, " +
    "narrow to the error you expect and rethrow the rest, pass it on as a cause, or report it: " +
    "log.warn, log.error or logFailure from server/log.ts, or reportServerException from " +
    "server/posthog.ts. For text that may not parse, use parseJson, bodyJson, bodyFields, " +
    "jwtClaims, decodeBase64 or languageName from server/parse.ts, or URL.parse.",
  valid: [
    { filename, code: "try { work(); } catch (error) { log.error('pull_failed', { error }); }" },
    {
      filename,
      code: "try { work(); } catch (cause) { throw new Unavailable('down', { cause }); }",
    },
    {
      filename,
      code: "try { work(); } catch (error) { if (!(error instanceof Gone)) throw error; }",
    },
    { filename, code: "work().catch(logFailure('pull_failed'));" },
    { filename, code: "work().catch((error) => report(env, error));" },
    { filename, code: "work().then(() => true, (error) => settle(error));" },
    { filename, code: "const Locale = schema.catch('en');" },
    { filename, code: "const results = await Promise.allSettled(work);" },
  ],
  invalid: [
    { filename, code: "try { work(); } catch {}", errors: ["catch {}"] },
    {
      filename,
      code: "try { work(); } catch (error) { return null; }",
      errors: ["catch (error) { return null; }"],
    },
    {
      filename,
      code: "try { work(); } catch (error) { void error; }",
      errors: ["catch (error) { void error; }"],
    },
    {
      filename,
      code: "try { work(); } catch { throw new Unavailable(); }",
      errors: ["catch { throw new Unavailable(); }"],
    },
    { filename, code: "work().catch(() => undefined);", errors: ["() => undefined"] },
    { filename, code: "const noop = () => {}; work().catch(noop);", errors: ["noop"] },
    { filename, code: "work().then(done, () => false);", errors: ["() => false"] },
    {
      filename,
      code: "await Promise.allSettled([work()]);",
      errors: ["Promise.allSettled([work()])"],
    },
    {
      filename,
      code: "ctx.waitUntil(Promise.allSettled([work()]));",
      errors: ["Promise.allSettled([work()])"],
    },
  ],
});
