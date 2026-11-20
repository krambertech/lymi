import { describe, expect, it } from "vitest";
import { type AlertButton, arrangeButtons, buttonTone } from "./alert-buttons";

const cancel: AlertButton = { text: "Keep member", style: "cancel" };
const remove: AlertButton = { text: "Remove member", style: "destructive" };
const keep: AlertButton = { text: "Keep the decks" };

describe("arrangeButtons", () => {
  it("gives a notice one OK that back and a tap outside also close", () => {
    const arranged = arrangeButtons([], "OK");
    expect(arranged.confirm).toEqual([{ text: "OK" }]);
    expect(arranged.dismiss).toBeUndefined();
    expect(arranged.dismissible).toBe(true);
    expect(arranged.stacked).toBe(false);
  });

  it("puts a question's cancel button in the dismiss slot, whatever its position", () => {
    expect(arrangeButtons([cancel, remove], "OK")).toMatchObject({
      dismiss: cancel,
      confirm: [remove],
      cancel,
      stacked: false,
      dismissible: true,
    });
    expect(arrangeButtons([remove, cancel], "OK")).toMatchObject({
      dismiss: cancel,
      confirm: [remove],
    });
  });

  it("must be answered when no button cancels", () => {
    const arranged = arrangeButtons([keep, remove], "OK");
    expect(arranged).toMatchObject({ dismiss: keep, confirm: [remove], dismissible: false });
    expect(arranged.cancel).toBeUndefined();
  });

  it("stacks three buttons with cancel last", () => {
    const archive: AlertButton = { text: "Archive the decks", style: "destructive" };
    const arranged = arrangeButtons([keep, archive, { text: "Cancel", style: "cancel" }], "OK");
    expect(arranged.stacked).toBe(true);
    expect(arranged.confirm).toEqual([keep, archive]);
    expect(arranged.dismiss?.text).toBe("Cancel");
  });
});

describe("buttonTone", () => {
  it("draws cancel as the safe action, destructive in red and the rest in the accent", () => {
    expect(buttonTone(cancel)).toBe("safe");
    expect(buttonTone(remove)).toBe("danger");
    expect(buttonTone(keep)).toBe("main");
  });
});
