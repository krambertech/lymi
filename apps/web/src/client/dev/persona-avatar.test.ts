import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { personas } from "../../server/dev/personas";
import { PersonaAvatar } from "./persona-avatar";

describe("persona avatars", () => {
  it("draw a face for every persona, so none falls back to a letter", () => {
    const lettered = personas.filter(
      (p) =>
        !renderToStaticMarkup(createElement(PersonaAvatar, { id: p.id, name: p.name })).startsWith(
          "<svg",
        ),
    );
    expect(lettered.map((p) => p.id)).toEqual([]);
  });
});
