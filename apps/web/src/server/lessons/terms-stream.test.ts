import { describe, expect, it } from "vitest";
import { TermsStream } from "./terms-stream";

describe("TermsStream", () => {
  it("hands over each term once it is complete, across chunks and through braces inside strings", () => {
    const reply = JSON.stringify({
      terms: [
        { id: "t1", term: "jooma · juua · joon", seen: "a { brace" },
        { id: "t2", term: "sööma", seen: 'a "quote" }' },
      ],
      questions: [],
    });
    const stream = new TermsStream();
    const found: unknown[] = [];
    for (let i = 0; i < reply.length; i += 5) found.push(...stream.push(reply.slice(i, i + 5)));
    expect(found).toEqual(JSON.parse(reply).terms);
    expect(JSON.parse(stream.all)).toEqual(JSON.parse(reply));
  });
});
