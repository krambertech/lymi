import { useState } from "react";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "../components/button";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { Variants } from "./frame";

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Rename deck</DialogTitle>
        </DialogContent>
      </Dialog>
    </>
  );
}

test("an overlay opened from a canvas keeps the theme and motion the canvas picked", async () => {
  document.documentElement.dataset.theme = "light";
  const screen = await render(<Variants items={[{ label: "Dialog", render: () => <Opener /> }]} />);
  await screen.getByRole("button", { name: "Dark theme" }).click();
  const reduce = screen.getByRole("button", { name: "Reduce motion" });
  // The switch starts from the system setting, which the test browser may already reduce.
  if (reduce.element().getAttribute("aria-pressed") !== "true") await reduce.click();
  await screen.getByRole("button", { name: "Open" }).click();
  const title = screen.getByText("Rename deck");
  await expect.element(title).toBeVisible();
  expect(title.element().closest("[data-theme]")?.getAttribute("data-theme")).toBe("dark");
  expect(title.element().closest("[data-motion]")?.getAttribute("data-motion")).toBe("reduce");
});
