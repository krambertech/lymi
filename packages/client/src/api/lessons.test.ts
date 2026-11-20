import { describe, expect, it } from "vitest";
import { linkReadRefusal } from "./lessons";
import { ApiError } from "./request";

const refusal = (code: string, issues?: Record<string, string>) =>
  new ApiError(400, "Refused", issues, code);

describe("linkReadRefusal", () => {
  it("reads why a link was refused and what it named", () => {
    expect(
      linkReadRefusal(refusal("link_refused", { refused: "youtube", title: "Eesti keel" })),
    ).toEqual({ kind: "refused", refused: "youtube", title: "Eesti keel", service: null });
    expect(linkReadRefusal(refusal("link_refused", { refused: "later" }))).toEqual({
      kind: "unreadable",
    });
  });

  it("reads a long article's count, with no limit when the server sends none", () => {
    expect(
      linkReadRefusal(refusal("long_read", { reads: "2", words: "16000", left: "1" })),
    ).toEqual({ kind: "long_read", reads: 2, words: 16000, left: 1 });
    expect(linkReadRefusal(refusal("long_read", { reads: "2", words: "16000" }))).toMatchObject({
      left: null,
    });
  });

  it("is null for any other failure", () => {
    expect(linkReadRefusal(refusal("daily_limit"))).toBeNull();
    expect(linkReadRefusal(new Error("offline"))).toBeNull();
  });
});
