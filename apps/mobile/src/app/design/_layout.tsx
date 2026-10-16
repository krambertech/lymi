import { Redirect } from "expo-router";
import { TabStack } from "../../ui/stack";

/** The design system's own stack, so its pages push from the side like any page. Development builds only. */
export default function DesignLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <TabStack />;
}
