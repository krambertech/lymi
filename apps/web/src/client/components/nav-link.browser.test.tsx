import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NavLink, StaticNavProvider } from "./nav-link";

const link = (
  <NavLink
    to="/review"
    search={{ deck: "d1" }}
    aria-describedby="hint"
    data-kind="row"
    className="row"
  >
    Review
  </NavLink>
);

test("passes search, aria and data attributes through to the router link", async () => {
  const root = createRootRoute({ component: () => link });
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: "/review" })]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await render(<RouterProvider router={router} />);

  const anchor = page.getByRole("link", { name: "Review" });
  await expect.element(anchor).toHaveAttribute("href", "/review?deck=d1");
  await expect.element(anchor).toHaveAttribute("aria-describedby", "hint");
  await expect.element(anchor).toHaveAttribute("data-kind", "row");
  await expect.element(anchor).toHaveClass("row");
});

test("is an inert anchor under StaticNavProvider", async () => {
  await render(<StaticNavProvider path="/design">{link}</StaticNavProvider>);

  const anchor = page.getByRole("link", { name: "Review" });
  await expect.element(anchor).toHaveAttribute("href", "/review");
  await expect.element(anchor).toHaveAttribute("aria-describedby", "hint");
  await expect.element(anchor).toHaveAttribute("data-kind", "row");
  await expect.element(anchor).not.toHaveAttribute("search");

  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  anchor.element().dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
});

test("marks the link for the static path as the current page", async () => {
  await render(
    <StaticNavProvider path="/library/d1">
      <NavLink to="/library/$deckId" params={{ deckId: "d1" }}>
        Deck
      </NavLink>
    </StaticNavProvider>,
  );

  const anchor = page.getByRole("link", { name: "Deck" });
  await expect.element(anchor).toHaveAttribute("aria-current", "page");
  await expect.element(anchor).toHaveClass("active");
});
