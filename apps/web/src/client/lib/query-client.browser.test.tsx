import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { FailureShown } from "@lymi/client/failed-writes";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { type ComponentType, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { messages } from "../../locales/en.po";
import { Toaster, toast } from "../components/ui/toast";
import { ApiError, api, errorMessage } from "./api";
import { queryClient } from "./query-client";

i18n.load("en", messages);
i18n.activate("en");

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: object) => ({ options, useParams: () => ({ importId: "i1" }) }),
  useNavigate: () => vi.fn(),
}));
vi.mock("./queries", async (original) => {
  const { queryOptions } = await import("@tanstack/react-query");
  return {
    ...(await original<typeof import("./queries")>()),
    decksQuery: queryOptions({ queryKey: ["decks"], queryFn: () => [] }),
    readwiseQuery: queryOptions({ queryKey: ["readwise"], queryFn: () => ({ connection: null }) }),
    importQuery: () => queryOptions({ queryKey: ["import"], enabled: false }),
  };
});
vi.mock("../views/readwise-view", () => ({
  ReadwiseView: ({ onDisconnect }: { onDisconnect: () => void }) => (
    <button type="button" onClick={onDisconnect}>
      Write
    </button>
  ),
}));
vi.mock("../views/import-view", async (original) => ({
  ...(await original<typeof import("../views/import-view")>()),
  ImportWorkingView: ({ onCancel }: { onCancel: () => void }) => (
    <button type="button" onClick={onCancel}>
      Write
    </button>
  ),
}));

const UNREACHABLE = "Couldn’t reach Lymi. Check your connection and try again.";
const refused = () => new ApiError(0, UNREACHABLE);
const said = () => page.getByRole("region", { name: "Notifications" }).getByText(UNREACHABLE);

afterEach(() => {
  toast.close();
  queryClient.clear();
  vi.restoreAllMocks();
});

const show = (Screen: ComponentType) =>
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider i18n={i18n}>
        <Screen />
        <Toaster aria-label="Notifications" closeLabel="Dismiss" timeout={0} />
      </I18nProvider>
    </QueryClientProvider>,
  );

const write = () => page.getByRole("button", { name: "Write" }).click();
const screenOf = (route: unknown) =>
  (route as { options: { component: ComponentType } }).options.component;

test("a Readwise disconnect that fails says so", async () => {
  vi.spyOn(api, "disconnectReadwise").mockRejectedValue(refused());
  const { Route } = await import("../routes/settings_.readwise");
  await show(screenOf(Route));
  await write();
  await expect.element(said()).toBeVisible();
});

test("an import cancel that fails says so", async () => {
  queryClient.setQueryData(["import"], { status: "importing" });
  vi.spyOn(api, "cancelImport").mockRejectedValue(refused());
  const { Route } = await import("../routes/import.$importId");
  await show(screenOf(Route));
  await write();
  await expect.element(said()).toBeVisible();
});

const inline: FailureShown = { failure: "inline" };

function Form({ send }: { send: () => Promise<void> }) {
  const save = useMutation({ meta: inline, mutationFn: send });
  return (
    <>
      <button type="button" onClick={() => save.mutate()}>
        Write
      </button>
      {save.isError && <p role="alert">{errorMessage(save.error)}</p>}
    </>
  );
}

test("a failure its own screen renders is said once, there", async () => {
  await show(() => <Form send={() => Promise.reject(refused())} />);
  await write();
  await expect.element(page.getByRole("alert")).toHaveTextContent(UNREACHABLE);
  expect(document.querySelector('[data-slot="toast"]')).toBeNull();
});

test("a failure that lands after its screen has gone is said in a toast", async () => {
  const sent = Promise.withResolvers<void>();
  await show(() => {
    const [open, setOpen] = useState(true);
    return (
      <>
        {open && <Form send={() => sent.promise} />}
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </>
    );
  });
  await write();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.element(page.getByRole("button", { name: "Write" })).not.toBeInTheDocument();
  sent.reject(refused());
  await expect.element(said()).toBeVisible();
});

test("meta names where a failure shows, and nothing else compiles", () => {
  const typo: FailureShown = {
    // @ts-expect-error -- not a place a failure shows
    failure: "quiet",
  };
  // @ts-expect-error -- silence gives its reason
  const unexplained: FailureShown = { failure: "silent" };
  const options: Parameters<typeof useMutation>[0] = {
    // @ts-expect-error -- TanStack's own meta is this type, so a typo in useMutation fails too
    meta: { failure: "inlin" },
  };
  expect([typo, unexplained, options]).toHaveLength(3);
});
