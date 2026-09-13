import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "./http";
import type { AppEnv } from "./index";
import { ServiceError } from "./services/context";

class DrizzleQueryError extends Error {
  override name = "DrizzleQueryError";
}

function appThrowing(err: Error) {
  const cards = new Hono<AppEnv>();
  cards.patch("/:id", () => {
    throw err;
  });
  const app = new Hono<AppEnv>();
  app.use("/api/*", (_c, next) => next());
  app.route("/api/cards", cards);
  app.onError(handleError);
  return app;
}

describe("handleError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the route and error class, never the SQL or its parameters", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appThrowing(
      new DrizzleQueryError(
        'Failed query: update "card" set "meaning" = ? where "user_id" = ?\nparams: to hurry up,user-1',
      ),
    );

    const res = await app.request("/api/cards/card-1?term=sbrigarsi", { method: "PATCH" });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong" });
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("Request failed", {
      method: "PATCH",
      route: "/api/cards/:id",
      error: "DrizzleQueryError",
    });
    const logged = JSON.stringify(log.mock.calls);
    for (const secret of ["to hurry up", "user-1", "card-1", "sbrigarsi", "Failed query"]) {
      expect(logged).not.toContain(secret);
    }
  });

  it("answers a service error without logging it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appThrowing(new ServiceError("not_found", "Card not found"));

    const res = await app.request("/api/cards/card-1", { method: "PATCH" });

    expect(res.status).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });
});
