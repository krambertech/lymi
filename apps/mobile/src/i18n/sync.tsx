import { settingsQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { activate, deviceLanguage, forgetLanguage, isAppLanguage } from ".";

/** Signed in, the interface follows the learner's language in Settings; signed out, the phone's. */
export function LanguageSync({ signedIn }: { signedIn: boolean }) {
  const appLanguage = useQuery({ ...settingsQuery, enabled: signedIn }).data?.appLanguage;
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
