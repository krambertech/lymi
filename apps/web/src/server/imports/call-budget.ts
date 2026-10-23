/**
 * Cloudflare's cap on calls out of one Worker invocation (R2, D1, Images, fetch), as
 * `limits.subrequests` in wrangler.jsonc sets it, or its default of 10,000 when unset. A Workflow
 * run counts every step it takes in one invocation against the same cap, and a call past it
 * throws, so a run that spends it all cannot even record that it stopped.
 */
export const SUBREQUEST_LIMIT = 100_000;

/** Calls kept back for recording a failure, and for the few calls the budget does not see. */
export const FAILURE_RESERVE = 1_000;

const MESSAGE = "Import stopped before using up the Worker's subrequest budget";

/** Thrown in place of a call that would eat into the reserve. */
export class CallBudgetSpent extends Error {
  constructor(used: number) {
    super(`${MESSAGE} (${used} calls)`);
    this.name = "CallBudgetSpent";
  }
}

/** A step's error once it has crossed a Workflow step, which keeps its message, not its class. */
export function isCallBudgetSpent(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(MESSAGE);
}

// Building a statement or an image's transform happens in the Worker; only what they send counts.
const LOCAL = new Set(["prepare", "bind", "withSession", "input", "transform", "draw"]);

/**
 * Counts the calls one run makes through the bindings it wraps, and refuses any that would leave
 * less than the reserve, so the run stops while it can still mark its import failed. #939 hands a
 * long run over to a fresh one instead.
 */
export class CallBudget {
  used = 0;
  private failing = false;

  constructor(
    readonly limit = SUBREQUEST_LIMIT,
    readonly reserve = FAILURE_RESERVE,
  ) {}

  private spend() {
    if (!this.failing && this.used >= this.limit - this.reserve)
      throw new CallBudgetSpent(this.used);
    this.used++;
  }

  /**
   * From here on the run is recording its failure, and every call may use the reserve. A failing
   * run never goes back, so calls that land later, such as an event's settings lookup sent after
   * the step's work returned, are never refused.
   */
  startFailing(): void {
    this.failing = true;
  }

  /** The binding with every call it sends out counted; what a call returns stays the binding's. */
  wrap<T extends object>(binding: T): T {
    return this.proxy(binding, 0);
  }

  private proxy<T extends object>(target: T, depth: number): T {
    return new Proxy(target, {
      get: (t, key) => {
        const value = Reflect.get(t, key);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          const local = typeof key === "string" && LOCAL.has(key);
          if (!local) this.spend();
          const out = value.apply(t, args);
          // A prepared statement or an image in progress makes its call later.
          return local && out && typeof out === "object" && depth < 4
            ? this.proxy(out as object, depth + 1)
            : out;
        };
      },
    });
  }
}

/**
 * A step's work, with running out of calls turned into `final`'s error so the Workflow does not
 * retry a step that has no calls left to spend in this invocation.
 */
export async function stopOnSpent<T>(
  work: () => Promise<T>,
  final: (message: string) => Error,
): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof CallBudgetSpent) throw final(err.message);
    throw err;
  }
}
