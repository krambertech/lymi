import { expect, it, vi } from "vitest";
import { ReviewSessionTracker } from "./analytics-review-session";

const id = () => "01234567-89ab-4cde-8fab-0123456789ab";
it("counts net attempts after Undo and finishes once", () => {
  const send = vi.fn();
  const tracker = new ReviewSessionTracker(send, id);
  tracker.update("leg", { cardsDone: 0, cardCount: 5, first: true });
  tracker.update("leg", { cardsDone: 3, cardCount: 5, first: false });
  tracker.update("leg", { cardsDone: 2, cardCount: 5, first: false });
  tracker.finish("goal");
  tracker.finish("empty");
  tracker.abandon("navigation");
  expect(send).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledWith({
    name: "review_session_finished",
    session_id: id(),
    card_count: 2,
    is_first_session: true,
    ending: "goal",
  });
  tracker.update("continued", { cardsDone: 2, cardCount: 7, first: true });
  tracker.update("continued", { cardsDone: 4, cardCount: 7, first: true });
  tracker.finish("empty");
  expect(send.mock.calls[1]?.[0]).toMatchObject({ card_count: 2, is_first_session: false });
});
it("observes abandonment and does not create another stopped session", () => {
  const send = vi.fn();
  const tracker = new ReviewSessionTracker(send, id);
  tracker.update("one", { cardsDone: 2, cardCount: 6, first: false });
  tracker.update("one", { cardsDone: 3, cardCount: 8, first: false });
  tracker.abandon("pagehide");
  tracker.update("one", { cardsDone: 3, cardCount: 8, first: false }, false);
  tracker.abandon("navigation");
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0]?.[0]).toMatchObject({
    cards_done: 1,
    card_count: 4,
    reason: "pagehide",
  });
});
it("ends the previous scope on navigation and never fabricates empty completions", () => {
  const send = vi.fn();
  const tracker = new ReviewSessionTracker(send, id);
  tracker.update("old", { cardsDone: 0, cardCount: 5, first: true });
  tracker.update("new", { cardsDone: 0, cardCount: 3, first: true });
  expect(send.mock.calls[0]?.[0]).toMatchObject({
    reason: "navigation",
    cards_done: 0,
    card_count: 5,
  });
  tracker.finish("empty");
  expect(send).toHaveBeenCalledOnce();
});
it("names what the leg was opened for", () => {
  const send = vi.fn();
  const tracker = new ReviewSessionTracker(send, id);
  tracker.update("filter", { cardsDone: 0, cardCount: 3, first: false, scope: "chosen" });
  tracker.update("filter", { cardsDone: 3, cardCount: 3, first: false, scope: "chosen" });
  tracker.finish("empty");
  expect(send.mock.calls[0]?.[0]).toMatchObject({ scope: "chosen", card_count: 3 });
});
