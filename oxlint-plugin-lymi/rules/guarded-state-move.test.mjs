import { testRule } from "../test/run.mjs";

const filename = "exports.ts";

testRule("guarded-state-move", {
  message:
    "moveState writes nothing when another writer moved the row first, so dropping its rows reports " +
    "a move that may not have happened (#1164, #1231). Read the rows it returns, through the batch's " +
    "result when it runs in one, and handle an empty list.",
  valid: [
    {
      filename,
      code: "const [moved] = await moveState(db, exportStatus, move);\nif (!moved) stop();",
    },
    { filename, code: "const [, done] = await db.batch([audit, moveState(db, s, move)]);" },
    { filename, code: "async () => moveState(db, exportStatus, move);" },
    { filename, code: "writes.push(moveState(db, exportStatus, move));" },
    { filename, code: "if ((await moveState(db, exportStatus, move)).length) track(event);" },
  ],
  invalid: [
    { filename, code: "await moveState(db, exportStatus, move);", errors: ["moveState"] },
    { filename, code: "void moveState(db, exportStatus, move);", errors: ["moveState"] },
    {
      filename,
      code: "await ctx.db.batch([moveState(ctx.db, exportStatus, move), audit]);",
      errors: ["moveState"],
    },
    {
      filename,
      code: "await ctx.db.batch([old ? moveState(db, s, a) : moveState(db, s, b), audit]);",
      errors: ["moveState", "moveState"],
    },
    {
      filename,
      code: "const write = () => runBatch(db, [moveState(db, s, move)]);",
      errors: ["moveState"],
    },
  ],
});

testRule("guarded-state-move", {
  message:
    "Raw SQL that sets a status skips the legal moves in apps/web/src/server/state-machines.ts (#1164). " +
    "Use moveState, which names the status it leaves.",
  valid: [
    {
      filename,
      code: "await db.run(sql`update imports set media_done = 1 where id = ${id} and status = 'importing'`);",
    },
    { filename, code: "const open = sql`${imports.status} = 'ready'`;" },
    {
      filename,
      code: "sql`update ${schema.imports} set written = 1 where ${schema.imports.status} = 'ready'`;",
    },
    {
      filename,
      code: "sql`update imports set at = case when status = 'done' then 1 else 2 end`;",
    },
    { filename, code: 'const why = "Could not update the status";' },
  ],
  invalid: [
    {
      filename,
      code: "await db.run(sql`update imports set status = 'failed' where id = ${id}`);",
      errors: ["`update imports set status = 'failed' where id = ${id}`"],
    },
    {
      filename,
      code: "db.run(sql`update ${schema.imports} set status = 'failed'`);",
      errors: ["`update ${schema.imports} set status = 'failed'`"],
    },
    {
      filename,
      code: "sql`update ${t} set written = 1, ${schema.cards.enrichmentStatus} = null`;",
      errors: ["`update ${t} set written = 1, ${schema.cards.enrichmentStatus} = null`"],
    },
    {
      filename,
      code: "env.DB.prepare(\"UPDATE imports SET status = 'failed' WHERE id = ?\").bind(id);",
      errors: ["\"UPDATE imports SET status = 'failed' WHERE id = ?\""],
    },
    {
      filename,
      code: "sql`insert into imports values (1) on conflict do update set status = 'done'`;",
      errors: ["`insert into imports values (1) on conflict do update set status = 'done'`"],
    },
    {
      filename,
      code: "await db.run(sql`update cards set updated_at = 1,\n enrichment_status = null`);",
      errors: ["`update cards set updated_at = 1,\n enrichment_status = null`"],
    },
  ],
});
