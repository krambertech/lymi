interface HandBack {
  /** Trades the link for a session, and rejects with what went wrong. */
  complete: (link: string) => Promise<void>;
  signedIn: () => boolean;
  /** Asks whether to sign in again, and answers true for yes. */
  askToRetry: () => Promise<boolean>;
  retry: () => Promise<void>;
  report: (cause: unknown) => void;
}

/**
 * What to do with each link the browser hands back, answering whether it signed the learner in. A
 * failed link says so once, however many arrive, and says nothing to a learner already signed in:
 * the page's “Open Lymi for Mac again” sends a second link after the first has worked.
 */
export function handBack({ complete, signedIn, askToRetry, retry, report }: HandBack) {
  let asking = false;
  return async (link: string) => {
    try {
      await complete(link);
      return true;
    } catch (cause) {
      report(cause);
    }
    if (asking || signedIn()) return false;
    asking = true;
    try {
      // The browser's tab can still finish the sign-in while the question is up.
      if ((await askToRetry()) && !signedIn()) await retry();
    } catch (cause) {
      report(cause);
    } finally {
      asking = false;
    }
    return false;
  };
}
