import { eq } from "@lymi/core/db";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { schema } from "../db";
import { readUnsubscribeLink, signFlipLink, signUnsubscribeLink } from "../email/links";
import { json, type Session, type TestApp, testApp } from "../test-app";
import * as audit from "./audit";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { clearLocalEmailOutbox, latestLocalEmail, renderTransactionalEmail } from "./email";
import {
  dispatchLearningEmails,
  type LearnerFacts,
  learningStep,
  readFlip,
} from "./learning-email";
import * as modes from "./modes";
import { gradeCard, reviewQueue } from "./review";

const SECRET = "test-secret-at-least-thirty-two-characters";
const facts = (over: Partial<LearnerFacts> = {}): LearnerFacts => ({
  createdOn: "2026-11-01",
  firstReviewOn: null,
  lastReviewOn: null,
  reviewDays: 0,
  hasCards: false,
  hasPush: false,
  ...over,
});

describe("learningStep", () => {
  const reviewed = (over: Partial<LearnerFacts> = {}) =>
    facts({ firstReviewOn: "2026-11-01", lastReviewOn: "2026-11-01", reviewDays: 1, ...over });

  it("sends days 1, 3, 7 and 30 to a learner who reviewed one day", () => {
    const steps = ["02", "03", "04", "05", "08"].map(
      (day) => learningStep(reviewed(), `2026-11-${day}`)?.step ?? null,
    );
    expect(steps).toEqual(["next", null, "next", null, "back"]);
    expect(learningStep(reviewed(), "2026-12-01")?.step).toBe("last");
  });

  it("leaves days 1 and 3 to a learner with a habit or with reminders on", () => {
    expect(learningStep(reviewed({ reviewDays: 4 }), "2026-11-02")).toBeNull();
    expect(learningStep(reviewed({ hasPush: true }), "2026-11-02")).toBeNull();
    expect(learningStep(reviewed({ reviewDays: 4 }), "2026-11-08")?.step).toBe("back");
  });

  it("restarts from the last review, so a return skips what was due", () => {
    const returned = reviewed({ lastReviewOn: "2026-11-03", reviewDays: 2 });
    expect(learningStep(returned, "2026-11-08")).toBeNull();
    expect(learningStep(returned, "2026-11-10")?.anchor).toBe("2026-11-03");
  });

  it("sends a deck with no review day 1 and day 3, and no deck one email", () => {
    const deck = facts({ hasCards: true });
    expect(learningStep(deck, "2026-11-02")?.step).toBe("first");
    expect(learningStep(deck, "2026-11-04")?.step).toBe("how");
    expect(learningStep(deck, "2026-11-08")).toBeNull();
    expect(learningStep(facts(), "2026-11-02")?.step).toBe("nodeck");
    expect(learningStep(facts(), "2026-11-04")).toBeNull();
  });
});

describe("email links", () => {
  it("refuses a forged link and a Flip link used to unsubscribe", async () => {
    const flip = await signFlipLink(SECRET, {
      user: "u",
      card: "c",
      mode: "meaning_to_term",
      kind: "learning-due",
      language: "en",
      expires: 1,
    });
    expect(await readUnsubscribeLink(SECRET, flip)).toBeNull();
    expect(await readUnsubscribeLink(SECRET, "e30.AAAA")).toBeNull();
    const stop = await signUnsubscribeLink(SECRET, { user: "u", kind: "learning-due" });
    expect(await readUnsubscribeLink(SECRET, stop)).toEqual({ user: "u", kind: "learning-due" });
    expect(await readUnsubscribeLink("another-secret", stop)).toBeNull();
  });
});

describe("the rendered email", () => {
  const stop = "https://my.lymi.app/unsubscribe/x";
  const url = "https://my.lymi.app/flip/x?from=email-learning-due";

  it("draws a right-to-left cue in its own direction and offers no grades", async () => {
    const email = await renderTransactionalEmail("learning-due", "en", {
      learning: {
        cards: 10,
        decks: 1,
        deckName: "Arabic basics",
        card: { front: { text: "كتاب", lang: "ar", dir: "rtl" } },
        url,
        unsubscribeUrl: stop,
      },
    });
    expect(email.subject).toBe("10 cards to review");
    expect(email.html).toContain('lang="ar"');
    expect(email.html).toContain('dir="rtl"');
    expect(email.html).toContain("Flip");
    expect(email.html).not.toMatch(/Forgot|Hard|Easy/);
    expect(email.text).toContain(url);
    expect(email.text).toContain(stop);
  });

  it("teaches a new card with both sides and never says it came back", async () => {
    const email = await renderTransactionalEmail("learning-new", "uk", {
      learning: {
        cards: 3,
        decks: 1,
        deckName: "Іспанська A1",
        card: {
          front: { text: "el puente", lang: "es", dir: "ltr" },
          back: { text: "міст", lang: "uk", dir: "ltr" },
        },
        url,
        unsubscribeUrl: stop,
      },
    });
    expect(email.html).toContain("el puente");
    expect(email.html).toContain("міст");
    expect(email.text).not.toMatch(/back|again/i);
  });
});

describe("the series", () => {
  let app: TestApp;
  let session: Session;
  let ctx: ServiceContext;
  let cardId: string;
  const env = () => ({ ...app.env, SESSIONS: app.env.SESSIONS });
  /** 10:05 UTC on the local day after a review made now. */
  const tomorrowAtTen = () => {
    const at = new Date(Date.now() + 86_400_000);
    at.setUTCHours(10, 5, 0, 0);
    return at;
  };

  beforeAll(async () => {
    app = await testApp();
    session = await app.signUp("flip");
    ctx = { db: app.db, userId: session.userId, actor: "user" };
    const deck = await createDeck(ctx, { name: "Spanish A1", defaultLanguage: "es" });
    await addCards(ctx, [
      { deckId: deck.id, term: "el puente", meaning: "bridge" },
      { deckId: deck.id, term: "la mesa", meaning: "table" },
    ]);
    const { items } = await reviewQueue(ctx);
    const first = items[0];
    if (!first) throw new Error("The deck has no cards to review");
    cardId = first.card.id;
    await gradeCard(ctx, { cardId, mode: first.mode, rating: 3 });
  }, 60_000);

  afterEach(async () => {
    clearLocalEmailOutbox();
    await app.db.delete(schema.learningEmails);
  });

  it("sends nothing until it is switched on", async () => {
    const result = await dispatchLearningEmails(env(), tomorrowAtTen());
    expect(result).toEqual({ considered: 0, sent: 0, failed: 0 });
    expect(latestLocalEmail(session.email)).toBeNull();
  });

  it("skips an account older than the switch-on date", async () => {
    const result = await dispatchLearningEmails(
      { ...env(), LEARNING_EMAILS_SINCE: "2999-01-01" },
      tomorrowAtTen(),
    );
    expect(result.sent).toBe(0);
  });

  it("sends once, however many runs land in the window", async () => {
    const on = { ...env(), LEARNING_EMAILS_SINCE: "2020-01-01" };
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(1);
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(0);
    expect(latestLocalEmail(session.email)?.kind).toMatch(/^learning-(new|due)$/);
  });

  it("sends day 3 after day 1, because each day claims its own step", async () => {
    const on = { ...env(), LEARNING_EMAILS_SINCE: "2020-01-01" };
    const later = tomorrowAtTen();
    later.setUTCDate(later.getUTCDate() + 2);
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(1);
    expect((await dispatchLearningEmails(on, later)).sent).toBe(1);
  });

  it("does not resend when the audit fails after delivery", async () => {
    const on = { ...env(), LEARNING_EMAILS_SINCE: "2020-01-01" };
    const write = vi.spyOn(audit, "audit").mockRejectedValueOnce(new Error("D1 is busy"));
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).failed).toBe(0);
    expect(write).toHaveBeenCalled();
    write.mockRestore();
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(0);
  });

  it("retries when composing fails before anything is delivered", async () => {
    const on = { ...env(), LEARNING_EMAILS_SINCE: "2020-01-01" };
    const read = vi.spyOn(modes, "catchUpStates").mockRejectedValueOnce(new Error("D1 is busy"));
    expect(await dispatchLearningEmails(on, tomorrowAtTen())).toMatchObject({ sent: 0, failed: 1 });
    read.mockRestore();
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(1);
  });

  it("leaves a deleted account's unsubscribe link harmless", async () => {
    const token = await signUnsubscribeLink(app.env.BETTER_AUTH_SECRET, {
      user: "gone",
      kind: "learning-due",
    });
    const response = await app.fetch(`/api/email/unsubscribe/${token}`, { method: "POST" });
    expect(response.status).toBe(200);
  });

  it("stops after a one-click unsubscribe, and a scanner's GET changes nothing", async () => {
    const on = { ...env(), LEARNING_EMAILS_SINCE: "2020-01-01" };
    const token = await signUnsubscribeLink(app.env.BETTER_AUTH_SECRET, {
      user: session.userId,
      kind: "learning-due",
    });
    const refused = await app.fetch(`/api/email/unsubscribe/${token}`);
    expect(refused.status).not.toBe(200);

    const response = await app.fetch(`/api/email/unsubscribe/${token}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });
    expect(response.status).toBe(200);
    const [row] = await app.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, session.userId));
    expect(row?.learningEmails).toBe(false);
    expect((await dispatchLearningEmails(on, tomorrowAtTen())).sent).toBe(0);

    await app.fetch("/api/settings", {
      ...json({ learningEmails: true }),
      method: "PATCH",
      as: session,
    });
  });

  it("reads a Flip link without grading, and lets only the learner grade", async () => {
    const secret = app.env.BETTER_AUTH_SECRET;
    const token = await signFlipLink(secret, {
      user: session.userId,
      card: cardId,
      mode: "meaning_to_term",
      kind: "learning-due",
      language: "en",
      expires: Date.now() + 86_400_000,
    });
    const before = await app.db.select().from(schema.reviews);
    const stranger = await readFlip(app.env, app.db, token, null);
    expect(stranger).toMatchObject({ status: "ok", canGrade: false, deckName: "Spanish A1" });
    const learner = await readFlip(app.env, app.db, token, session.userId);
    expect(learner).toMatchObject({ status: "ok", canGrade: true });
    expect(await app.db.select().from(schema.reviews)).toHaveLength(before.length);
  });

  it("expires a link to a card in an archived deck", async () => {
    const [card] = await app.db
      .select({ deckId: schema.cards.deckId })
      .from(schema.cards)
      .where(eq(schema.cards.id, cardId));
    const deckId = card?.deckId ?? "";
    const token = await signFlipLink(app.env.BETTER_AUTH_SECRET, {
      user: session.userId,
      card: cardId,
      mode: "meaning_to_term",
      kind: "learning-due",
      language: "en",
      expires: Date.now() + 86_400_000,
    });
    await app.db
      .update(schema.decks)
      .set({ archivedAt: new Date() })
      .where(eq(schema.decks.id, deckId));
    expect((await readFlip(app.env, app.db, token, session.userId)).status).toBe("expired");
    await app.db.update(schema.decks).set({ archivedAt: null }).where(eq(schema.decks.id, deckId));
  });

  it("calls an old link expired and a forged one invalid", async () => {
    const secret = app.env.BETTER_AUTH_SECRET;
    const token = await signFlipLink(secret, {
      user: session.userId,
      card: cardId,
      mode: "meaning_to_term",
      kind: "learning-due",
      language: "uk",
      expires: Date.now() - 1,
    });
    expect(await readFlip(app.env, app.db, token, null)).toEqual({
      status: "expired",
      language: "uk",
    });
    expect((await app.fetch("/api/email/flip/nonsense")).status).toBe(404);
  });
});
