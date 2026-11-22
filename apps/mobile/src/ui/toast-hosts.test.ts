import { expect, it } from "vitest";
import { frontHost, mountHost } from "./toast-hosts";

it("a screen presented over the root takes the toast, whichever host mounted last", () => {
  expect(frontHost()).toBeUndefined();
  const leaveReview = mountHost("review");
  const leaveRoot = mountHost(undefined);
  expect(frontHost()).toEqual({ scope: "review" });
  leaveReview();
  expect(frontHost()).toEqual({ scope: undefined });
  leaveRoot();
  expect(frontHost()).toBeUndefined();
});
