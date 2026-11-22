import { testRule } from "../test/run.mjs";

const filename = "screen.tsx";
const inline = 'meta: { failure: "inline" }';
const caller = 'meta: { failure: "caller" }';

testRule("failed-write-said", {
  message:
    "The code here handles this mutation's failure itself, and the app's own message would show " +
    'too. Say who shows it: meta: { failure: "inline" } when this component renders the error, or ' +
    '{ failure: "caller" } when an awaiting caller or its onError always says it (#1041).',
  valid: [
    {
      filename,
      code: "const stop = useMutation({ mutationFn: api.stop }); stop.mutate(); stop.isPending;",
    },
    { filename, code: `const save = useMutation({ ${inline}, mutationFn }); save.isError;` },
    { filename, code: `const save = useMutation({ ${caller}, mutationFn }); save.mutateAsync();` },
    { filename, code: `const { error } = useMutation({ ${inline}, mutationFn });` },
    { filename, code: "const query = useQuery({ queryFn }); query.isError;" },
    {
      filename,
      code: "function A(){ const save = useMutation({ mutationFn }); save.mutate(); } function B(save){ save.error; }",
    },
  ],
  invalid: [
    {
      filename,
      code: "const save = useMutation({ mutationFn }); save.isError;",
      errors: ["save"],
    },
    {
      filename,
      code: "const save = useMutation({ mutationFn, onError: (e) => refetch(e) }); save.error;",
      errors: ["save"],
    },
    {
      filename,
      code: "const save = useMutation({ mutationFn }); save.mutateAsync().catch(show);",
      errors: ["save"],
    },
    {
      filename,
      code: "const { mutate, isError } = useMutation({ mutationFn });",
      errors: ["{ mutate, isError }"],
    },
  ],
});

testRule("failed-write-said", {
  message:
    'Nothing here reads this mutation\'s error, so meta: { failure: "inline" } leaves a failed ' +
    "write unsaid. Render error or isError, or drop meta and the app's message says it (#1041).",
  valid: [
    {
      filename,
      code: `const create = useMutation({ ${inline}, mutationFn }); export const x = { create };`,
    },
    { filename, code: `const save = useMutation({ ${inline}, mutationFn }); save.mutateAsync();` },
    {
      filename,
      code: 'const setUp = useMutation({ meta: { failure: "silent", because: "unasked" }, mutationFn }); setUp.mutate();',
    },
  ],
  invalid: [
    {
      filename,
      code: `const stop = useMutation({ ${inline}, mutationFn }); stop.mutate(); stop.isPending;`,
      errors: ['{ failure: "inline" }'],
    },
    {
      filename,
      code: `const { mutate } = useMutation({ ${inline}, mutationFn });`,
      errors: ['{ failure: "inline" }'],
    },
  ],
});

testRule("failed-write-said", {
  message:
    "An onError turns off the app's failure message, and this one ignores the error and says " +
    'nothing. Add meta: { failure: "inline" } and render the error, or { failure: "silent", ' +
    "because } when the learner did not ask for this write (#1041).",
  valid: [
    { filename, code: "useMutation({ mutationFn, onError: failed });" },
    { filename, code: "useMutation({ mutationFn, onError: (e) => failed(e) });" },
    {
      filename,
      code: "useMutation({ mutationFn, onError: (_e, v) => { undo(v); toast.add({ error: true, title }); } });",
    },
    { filename, code: "useMutation({ mutationFn, onError: () => alert(title) });" },
    { filename, code: `useMutation({ ${inline}, mutationFn, onError: () => undo() });` },
  ],
  invalid: [
    {
      filename,
      code: "useMutation({ mutationFn, onError: (_error, _ids, before) => undo(before) });",
      errors: ["(_error, _ids, before) => undo(before)"],
    },
    { filename, code: "useMutation({ mutationFn, onError() {} });", errors: ["() {}"] },
  ],
});

testRule("failed-write-said", {
  message:
    "An onError passed to mutate runs only while its component is mounted, and the mutation cannot " +
    "see it. Put it in useMutation's options, or render the mutation's error (#960).",
  valid: [{ filename, code: "save.mutate(input, { onSuccess: () => router.back() });" }],
  invalid: [
    { filename, code: "save.mutate(input, { onError: (e) => alert(e) });", errors: ["onError"] },
  ],
});
