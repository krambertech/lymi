import { useLocalSearchParams } from "expo-router";
import { JoinScreen, LinkGone } from "../../sharing/join-screen";

/** `my.lymi.app/join/<token>`, a deck's join link, opened in the app. */
export default function Join() {
  const { token, continue: resume } = useLocalSearchParams<{ token?: string; continue?: string }>();
  if (!token) return <LinkGone />;
  return <JoinScreen arrival={{ kind: "link", token, resume: resume === "1" }} />;
}
