import type { TransactionalEmailKind, TransactionalEmailParams } from "../services/email";

/** What each kind is drawn with on the local `/emails` page. Invented, and never sent to a learner. */
export const EMAIL_SAMPLES: Record<TransactionalEmailKind, TransactionalEmailParams> = {
  test: {},
  "verify-email": { url: "https://my.lymi.app/api/auth/verify-email?token=sample" },
  "verify-email-code": { code: "481073" },
  "reset-password": { url: "https://my.lymi.app/api/auth/reset-password/sample" },
  "existing-account": { url: "https://my.lymi.app/login" },
  "google-account": { url: "https://my.lymi.app/login" },
  "reset-google-account": { url: "https://my.lymi.app/login" },
  "deck-invitation": {
    url: "https://my.lymi.app/join/sample",
    invitation: {
      deckId: "sample-deck",
      deckName: "Estonian A2: everyday phrases",
      ownerName: "Maria Kask",
      cards: 214,
      language: "et",
    },
  },
  feedback: {
    feedback: {
      kind: "idea",
      message: "Let a deck hold a picture on its cover.",
      from: "Lesia <lesia@example.com>",
      screen: "/library",
      appVersion: "local",
      browser: "Safari/18",
      language: "uk",
    },
  },
  "content-report": {
    contentReport: {
      id: "01JBREPORTSAMPLE00000000000",
      reason: "offensive",
      note: "The example sentence insults a group of people.",
      via: "member",
      reporter: "Lesia <lesia@example.com>",
      deckName: "Eesti slang",
      ownerName: "Mart",
      card: { term: "kurat", meaning: "damn", example: null, notes: null },
    },
  },
  "delete-account-code": { code: "205918" },
  "account-deleted": {},
};
