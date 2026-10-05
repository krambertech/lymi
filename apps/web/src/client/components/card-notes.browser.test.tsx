import { expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { CardNotes } from "./card-notes";

test("notes render formatting and a keyboard-accessible external link", async () => {
  await render(
    <CardNotes source="++underlined++ ~~old form~~ [**Dictionary**](https://example.com)" />,
  );
  expect(document.querySelector("u")?.textContent).toBe("underlined");
  expect(document.querySelector("s")?.textContent).toBe("old form");
  const link = page.getByRole("link", { name: "Dictionary" });
  await expect.element(link).toHaveAttribute("href", "https://example.com");
  await expect.element(link).toHaveAttribute("target", "_blank");
  await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(link.element().querySelector("strong")?.textContent).toBe("Dictionary");
  if (inject("machine") === "desktop") {
    await userEvent.tab();
    await expect.element(link).toHaveFocus();
  }
});

test("notes keep unsafe links, HTML and images as text", async () => {
  const source =
    '[unsafe](javascript:alert%281%29) <img src=x onerror="alert(1)"> ![image](https://example.com/a.png)';
  await render(<CardNotes source={source} />);
  await expect.element(page.getByText(source)).toBeVisible();
  expect(document.querySelector("a, img")).toBeNull();
});
