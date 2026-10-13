import { useLocalSearchParams } from "expo-router";
import { JoinScreen, LinkGone } from "../../sharing/join-screen";

/** `my.lymi.app/join/<token>`, a deck's join link, opened in the app. */
export default function Join() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  if (!token) return <LinkGone />;
  return <JoinScreen arrival={{ kind: "link", token }} />;
}
