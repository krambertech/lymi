import { useLocalSearchParams } from "expo-router";
import { JoinScreen, LinkGone } from "../../sharing/join-screen";

/** `my.lymi.app/add/<slug>`, "Add to Lymi" on a published deck's public page. ADR 0020. */
export default function Add() {
  const {
    slug,
    edition,
    continue: resume,
  } = useLocalSearchParams<{ slug?: string; edition?: string; continue?: string }>();
  if (!slug) return <LinkGone />;
  return <JoinScreen arrival={{ kind: "publication", slug, edition, resume: resume === "1" }} />;
}
