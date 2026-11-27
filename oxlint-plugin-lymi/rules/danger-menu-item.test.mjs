import { testRule } from "../test/run.mjs";

const filename = "new.tsx";

testRule("danger-menu-item", {
  message:
    'A menu row that archives, deletes, removes or signs out is variant="danger" ' +
    "(docs/design/system/overlays.md, Menus).",
  valid: [
    {
      filename,
      code: 'const a = <DropdownMenuItem variant="danger" onClick={onArchive}><Archive /><Trans>Archive</Trans></DropdownMenuItem>;',
    },
    {
      filename,
      code: "const b = <DropdownMenuItem onClick={onShowArchived}><Archive /><Trans>Archived decks</Trans></DropdownMenuItem>;",
    },
    {
      filename,
      code: "const c = <DropdownMenuItem onClick={onShowArchived}><Archive />{t`Archived decks`}</DropdownMenuItem>;",
    },
    {
      filename,
      code: "const d = <DropdownMenuItem onClick={onRename}><PencilLine /><Trans>Rename…</Trans></DropdownMenuItem>;",
    },
    {
      filename,
      code: 'const e = <DropdownMenuItem variant={mine ? "danger" : "default"}><LogOut /></DropdownMenuItem>;',
    },
  ],
  invalid: [
    {
      filename,
      code: "const a = <DropdownMenuItem onClick={() => onArchive(tag)}><Archive /><Trans>Archive</Trans></DropdownMenuItem>;",
      errors: ["<DropdownMenuItem onClick={() => onArchive(tag)}>"],
    },
    {
      filename,
      code: 'const b = <DropdownMenuItem variant="default"><Trash2 aria-hidden="true" />{t`Delete series`}</DropdownMenuItem>;',
      errors: ['<DropdownMenuItem variant="default">'],
    },
  ],
});
