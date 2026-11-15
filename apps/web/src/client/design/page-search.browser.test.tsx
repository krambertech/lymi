import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { appleKeyboard } from "../lib/device";
import { FrameDocument } from "./device-frame";
import { PageSearch, usePageSearch } from "./page-search";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

function WithOverlay() {
  const search = usePageSearch();
  return (
    <>
      <div role="menu">
        <button type="button">Rename</button>
      </div>
      <button type="button">Outside</button>
      <PageSearch open={search.open} onOpenChange={search.setOpen} />
    </>
  );
}

function pressFind() {
  const apple = appleKeyboard();
  window.dispatchEvent(
    new KeyboardEvent("keydown", { code: "KeyK", key: "k", metaKey: apple, ctrlKey: !apple }),
  );
}

test("⌘K waits while an overlay has focus", async () => {
  await render(<WithOverlay />);
  page.getByRole("button", { name: "Rename" }).element().focus();
  pressFind();
  await expect.element(page.getByRole("combobox")).not.toBeInTheDocument();
  page.getByRole("button", { name: "Outside" }).element().focus();
  pressFind();
  await expect.element(page.getByRole("combobox")).toBeInTheDocument();
});

test("⌘K inside a specimen frame reaches the page's search", async () => {
  const forwarded = vi.spyOn(window.parent, "dispatchEvent");
  await render(<FrameDocument specimen="none" />);
  pressFind();
  expect(forwarded.mock.lastCall?.[0]).toHaveProperty("code", "KeyK");
  forwarded.mockRestore();
});

test("Enter takes the best match when a lower section holds it", async () => {
  await render(<PageSearch open onOpenChange={() => {}} />);
  await userEvent.type(page.getByRole("combobox"), "day");
  await userEvent.keyboard("{Enter}");
  expect(navigate).toHaveBeenLastCalledWith({
    to: "/design/components/$group",
    params: { group: "charts" },
    hash: "day-grid",
  });
});

test("a search shows only what matches, titles first, and goes to the component's section", async () => {
  await render(<PageSearch open onOpenChange={() => {}} />);
  await userEvent.type(page.getByRole("combobox"), "chip");
  const options = page.getByRole("option");
  // Streak and Layout are both a foundation and a group; they must not linger from the first list.
  await expect
    .poll(() => options.elements().map((o) => o.textContent))
    .toEqual(["ChipLabels", "Source chipLabels", expect.stringMatching(/^Labels/)]);
  await userEvent.keyboard("{Enter}");
  expect(navigate).toHaveBeenCalledWith({
    to: "/design/components/$group",
    params: { group: "labels" },
    hash: "chip",
  });
});

test("picking the section the page is already on scrolls back to it", async () => {
  const section = document.createElement("section");
  section.id = "chip";
  section.scrollIntoView = vi.fn();
  document.body.append(section);
  window.location.hash = "#chip";
  await render(<PageSearch open onOpenChange={() => {}} />);
  await userEvent.type(page.getByRole("combobox"), "chip");
  await userEvent.keyboard("{Enter}");
  expect(section.scrollIntoView).toHaveBeenCalled();
  section.remove();
  window.location.hash = "";
});
