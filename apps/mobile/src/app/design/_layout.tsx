import { Redirect, Stack } from "expo-router";
import { useStackOptions } from "../../ui/screen";

/** The design system's own stack, so its pages push from the side like any page. Development builds only. */
export default function DesignLayout() {
  const options = useStackOptions();
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={options} />;
}
