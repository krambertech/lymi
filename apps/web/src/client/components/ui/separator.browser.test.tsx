import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Separator } from "./separator";

test("a generated component renders with Lymi's tokens, not shadcn's theme", async () => {
  await render(
    <div className="flex h-10 gap-2">
      <Separator />
      <Separator orientation="vertical" />
    </div>,
  );
  const [horizontal, vertical] = page.getByRole("separator").elements();

  expect(horizontal?.getAttribute("aria-orientation")).not.toBe("vertical");
  expect(vertical?.getAttribute("aria-orientation")).toBe("vertical");
  const probe = document.body.appendChild(document.createElement("div"));
  probe.className = "bg-edge";
  expect(horizontal && getComputedStyle(horizontal).backgroundColor).toBe(
    getComputedStyle(probe).backgroundColor,
  );
  probe.remove();
  expect(horizontal && getComputedStyle(horizontal).height).toBe("1px");
  expect(vertical && getComputedStyle(vertical).width).toBe("1px");
});
