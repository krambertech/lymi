interface HandBack {
  complete: (link: string) => Promise<void>;
  signedIn: () => boolean;
  askToRetry: () => Promise<boolean>;
  retry: () => Promise<void>;
  report: (cause: unknown) => void;
}

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
      if ((await askToRetry()) && !signedIn()) await retry();
    } catch (cause) {
      report(cause);
    } finally {
      asking = false;
    }
    return false;
  };
}
