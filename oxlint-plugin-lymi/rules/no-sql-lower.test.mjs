import { testRule } from "../test/run.mjs";

const filename = "decks.ts";

testRule("no-sql-lower", {
  message:
    "SQLite's lower() folds ASCII only, so Дієслова and дієслова stay different on D1. Fold in " +
    "JavaScript with toLocaleLowerCase() and bind the result, or store a normalised column.",
  valid: [
    { filename, code: "const a = sql`SELECT * FROM decks WHERE name = ?`;" },
    { filename, code: "const b = sql`SELECT lower(hex(id)) FROM decks`;" },
    { filename, code: "const c = sql`SELECT flower(name) FROM decks`;" },
    { filename, code: "const d = db.sql`SELECT lower(name) FROM decks`;" },
  ],
  invalid: [
    {
      filename,
      code: "const a = sql`SELECT * FROM decks WHERE lower(name) = ?`;",
      errors: ["sql`SELECT * FROM decks WHERE lower(name) = ?`"],
    },
    {
      filename,
      code: "const b = SQL`select LOWER( name) from decks`;",
      errors: ["SQL`select LOWER( name) from decks`"],
    },
    {
      filename,
      code: "const c = sql`select lower(${column})`;",
      errors: ["sql`select lower(${column})`"],
    },
    {
      filename,
      code: "const d = sql`\n  SELECT id\n  FROM decks\n  WHERE lower(name) = ?\n`;",
      errors: ["sql`\n  SELECT id\n  FROM decks\n  WHERE lower(name) = ?\n`"],
    },
  ],
});
