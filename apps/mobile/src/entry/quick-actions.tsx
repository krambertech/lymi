import { useLingui } from "@lingui/react/macro";
import * as Linking from "expo-linking";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { useEffect } from "react";
import { Platform } from "react-native";
import { entryLink } from "./links";

/** Lymi's own symbol from the app's asset catalog; Android would need each bundled as an image. */
const icon = (name: string) => (Platform.OS === "ios" ? `asset:lymi.${name}` : null);

/**
 * The app icon's long-press actions, in the learner's language. Each opens its link, so one
 * chosen while signed out continues after sign-in.
 */
export function QuickActionsSync() {
  const { t } = useLingui();
  useEffect(() => {
    QuickActions.setItems([
      {
        id: "add",
        title: t`Add a word`,
        icon: icon("plus"),
        params: { href: entryLink("add", "quick_action") },
      },
      {
        id: "review",
        title: t`Review`,
        icon: icon("play"),
        params: { href: entryLink("review", "quick_action") },
      },
      {
        id: "search",
        title: t`Search`,
        icon: icon("search"),
        params: { href: entryLink("search", "quick_action") },
      },
    ]).catch((e: unknown) => console.warn("quick actions", e));
  }, [t]);

  // A stable callback: the hook replays the launching action whenever its callback changes.
  useQuickActionCallback(openAction);
  return null;
}

function openAction(action: QuickActions.Action) {
  const href = action.params?.href;
  if (typeof href === "string") void Linking.openURL(href);
}
