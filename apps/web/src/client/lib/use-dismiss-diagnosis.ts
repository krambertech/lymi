import { useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api } from "./api";

/**
 * Records that a diagnosis named the wrong cause and offers Undo in a toast. `onUndone` runs
 * once the dismissal is taken back, so the screen can bring the offer back.
 */
export function useDismissDiagnosis(onUndone: (id: string) => void) {
  const { t } = useLingui();
  // The toast outlives the sheet, and a mutation's own callbacks still run after unmount.
  const undo = useMutation({
    mutationFn: (id: string) => api.undoDismissal(id),
    onSuccess: (_r, id) => {
      toast.close(`dismiss-${id}`);
      onUndone(id);
    },
    onError: (_e, id) =>
      toast.add({
        id: `dismiss-${id}`,
        type: "error",
        title: t`Couldn’t undo the change. Check your connection and try again.`,
      }),
  });
  return useMutation({
    mutationFn: (id: string) => api.dismissDiagnosis(id),
    onSuccess: (_r, id) =>
      toast.add({
        id: `dismiss-${id}`,
        title: t`Lymi won’t offer this fix again`,
        actionProps: { children: t`Undo`, onClick: () => undo.mutate(id) },
      }),
    onError: (_e, id) =>
      toast.add({
        id: `dismiss-${id}`,
        type: "error",
        title: t`Couldn’t stop offering this fix. Check your connection and try again.`,
      }),
  });
}
