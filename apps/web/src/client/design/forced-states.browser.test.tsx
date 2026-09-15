import type { ReactNode } from "react";
import { expect, inject, test } from "vitest";
import { render } from "vitest-browser-react";
import { Force, useForcedStates } from "./forced-states";

// Hover rules sit under the fine-pointer query, as in the product, so they apply on the desktop machine only.
const desktop = inject("machine") === "desktop";

const CSS = `
  .probe { color: rgb(0, 0, 0); }
  @media (hover: hover) and (pointer: fine) { .probe:hover { color: rgb(255, 0, 0); } }
  .probe:focus-visible { outline: 2px solid rgb(0, 0, 255); }
  .probe:not(:focus-visible) { background-color: rgb(0, 255, 0); }
  .hoverable\\:hover\\:probe:hover { color: rgb(1, 2, 3); }
  .glide { transition-duration: 300ms; }
  @media (prefers-reduced-motion: reduce) { .glide { transition-duration: 0ms; } }
  @media (prefers-reduced-motion: no-preference) { .glide { animation-name: sway; } }
`;

function Sheet() {
  useForcedStates();
  return null;
}

async function setUp(children: ReactNode) {
  const style = document.head.appendChild(document.createElement("style"));
  style.textContent = CSS;
  const screen = await render(
    <>
      <Sheet />
      {children}
    </>,
  );
  return {
    style: (id: string) => getComputedStyle(screen.getByTestId(id).element()),
    [Symbol.dispose]: () => style.remove(),
  };
}

test.runIf(desktop)("Force holds an element in hover or focus, and only that element", async () => {
  using page = await setUp(
    <>
      <span data-testid="plain" className="probe" />
      <Force state="hover">
        <span data-testid="hover" className="probe" />
      </Force>
      <Force state="hover">
        <span data-testid="escaped" className="hoverable:hover:probe" />
      </Force>
      <Force state="focus" on="[data-testid=focus]">
        <span>
          <span data-testid="focus" className="probe" />
        </span>
      </Force>
    </>,
  );
  await expect.poll(() => page.style("hover").color).toBe("rgb(255, 0, 0)");
  expect(page.style("plain").color).toBe("rgb(0, 0, 0)");
  // A colon escaped inside a class name is part of the name, not a state.
  expect(page.style("escaped").color).toBe("rgb(1, 2, 3)");
  await expect.poll(() => page.style("focus").outlineStyle).toBe("solid");
  // A state under `:not()` turns off, rather than both matching at once.
  expect(page.style("focus").backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(page.style("plain").backgroundColor).toBe("rgb(0, 255, 0)");
});

test("data-motion stands in for the reduced-motion query inside it", async () => {
  using page = await setUp(
    <>
      <span data-testid="full" className="glide" />
      <div data-motion="reduce">
        <span data-testid="reduced" className="glide" />
      </div>
    </>,
  );
  await expect.poll(() => page.style("reduced").transitionDuration).toBe("0s");
  expect(page.style("full").transitionDuration).toBe("0.3s");
  expect(page.style("full").animationName).toBe("sway");
});
