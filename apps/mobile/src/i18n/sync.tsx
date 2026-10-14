import { settingsQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { activate, deviceLanguage, forgetLanguage, isAppLanguage } from ".";

/** Signed in, the interface follows the learner's language in Settings; signed out, the phone's. */
export function LanguageSync({ signedIn }: { signedIn: boolean }) {
  // The kept cache can hold a language changed since on the web, so each launch asks again.
  const appLanguage = useQuery({ ...settingsQuery, enabled: signedIn, refetchOnMount: "always" })
    .data?.appLanguage;
  useEffect(() => {
    if (!signedIn) {
      forgetLanguage();
      activate(deviceLanguage());
    } else if (isAppLanguage(appLanguage)) {
      activate(appLanguage);
    }
  }, [signedIn, appLanguage]);
  return null;
}
