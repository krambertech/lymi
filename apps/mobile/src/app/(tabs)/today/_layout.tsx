import { Stack } from "expo-router";
import { useStackOptions } from "../../../ui/screen";

export default function TabStack() {
  return <Stack screenOptions={useStackOptions()} />;
}
