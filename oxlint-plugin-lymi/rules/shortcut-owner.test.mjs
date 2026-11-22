import { testRule } from "../test/run.mjs";

const filename = "page-search.tsx";

testRule("shortcut-owner", {
  message:
    "Use useShortcut() from lib/use-shortcut.ts, which ignores a key under an open overlay, in a " +
    "field, on repeat, with a modifier or while an input method composes. Handlers written by hand " +
    "forgot one and stacked ⌘K over an open dialog (#813, #1083). A listener that is not a shortcut " +
    "says why in an oxlint-disable.",
  valid: [
    { filename, code: 'useShortcut({ mod: "k" }, () => setOpen((o) => !o), { focus: "any" });' },
    { filename, code: 'group.addEventListener("keydown", onKey, true);' },
    { filename, code: 'window.addEventListener("pointerdown", skip, { once: true });' },
    { filename, code: 'window.removeEventListener("keydown", onKey);' },
  ],
  invalid: [
    {
      filename,
      code: `useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.shiftKey) return;
      if (appleKeyboard() ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey) return;
      if (e.code !== "KeyK" && e.key?.toLowerCase() !== "k") return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);`,
      errors: ["window.addEventListener"],
    },
    {
      filename,
      code: 'document.addEventListener("keyup", onKey, true);',
      errors: ["document.addEventListener"],
    },
    {
      filename,
      code: 'ref.current!.ownerDocument.addEventListener("keypress", onKey);',
      errors: ["ref.current!.ownerDocument.addEventListener"],
    },
    {
      filename,
      code: 'document.body.addEventListener("keydown", onKey);',
      errors: ["document.body.addEventListener"],
    },
    { filename, code: 'addEventListener("keydown", onKey);', errors: ["addEventListener"] },
    { filename, code: "window.onkeydown = onKey;", errors: ["window.onkeydown"] },
  ],
});
