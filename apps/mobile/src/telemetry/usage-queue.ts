import type {
  PostHogCore,
  PostHogEventProperties,
  PostHogPersistedProperty,
  RetriableOptions,
} from "@posthog/core";

const USAGE = "usage";
const USAGE_QUEUE = "lymi_usage_queue" as PostHogPersistedProperty;

/**
 * Keeps usage events in a queue of their own that sends only the account `sendable()` names, so a
 * crash report never waits on consent and usage never outlives it. docs/analytics.md.
 */
// biome-ignore lint/suspicious/noExplicitAny: a mixin's constructor takes whatever its base does.
export function withUsageQueue<Base extends abstract new (...args: any[]) => PostHogCore>(
  base: Base,
  sendable: () => string | undefined,
) {
  abstract class UsageQueue extends base {
    /** Drops every usage event not yet sent, whoever it belongs to. */
    dropUsage(): void {
      this.wrap(() => this.setPersistedProperty(USAGE_QUEUE, []));
    }

    protected override getQueueRouteKey(message: PostHogEventProperties): string {
      return message.event === "$exception" ? super.getQueueRouteKey(message) : USAGE;
    }

    protected override persistedQueueKeyForRoute(route: string): PostHogPersistedProperty {
      return route === USAGE ? USAGE_QUEUE : super.persistedQueueKeyForRoute(route);
    }

    // Held, not sent, until the signed-in account's consent is known.
    protected override getActiveQueueRoutes(): string[] {
      const routes = super.getActiveQueueRoutes();
      return sendable() ? [...routes, USAGE] : routes;
    }

    // Checked again at sending, so a flush already under way never carries another account's events.
    protected override sendBatch(
      messages: (PostHogEventProperties | undefined)[],
      retry?: Partial<RetriableOptions>,
      route?: string,
    ): Promise<void> {
      if (route !== USAGE) return super.sendBatch(messages, retry, route);
      const account = sendable();
      const kept = messages.filter((message) => !!account && message?.distinct_id === account);
      return kept.length ? super.sendBatch(kept, retry, route) : Promise.resolve();
    }
  }
  return UsageQueue;
}
