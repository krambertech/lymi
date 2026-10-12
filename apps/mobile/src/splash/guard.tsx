import { Component, type ReactNode, useEffect } from "react";

/** However the splash fares, the app is never left behind it: these drop it and hide the launch screen. */
const AFTER_READY_MS = 4000;
const AT_MOST_MS = 10000;

/** Drops the splash if it throws, so a broken animation costs a frame rather than the app. */
export class SplashGuard extends Component<{ onFail: () => void; children: ReactNode }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Drops the splash if its clock stalls: a while after the first screen is known, or at most `AT_MOST_MS`. */
export function useGiveUp(active: boolean, ready: boolean, giveUp: () => void) {
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(giveUp, AT_MOST_MS);
    return () => clearTimeout(id);
  }, [active, giveUp]);
  useEffect(() => {
    if (!active || !ready) return;
    const id = setTimeout(giveUp, AFTER_READY_MS);
    return () => clearTimeout(id);
  }, [active, ready, giveUp]);
}
