import type { ReactNode } from "react";
import { Screen } from "../ui/screen";

/** The frame every import screen shares: a page with a plain back, since it opens from anywhere. */
export function ImportShell({
  title,
  description,
  scrollKey,
  children,
}: {
  title: string;
  description?: string | undefined;
  scrollKey?: string;
  children: ReactNode;
}) {
  return (
    <Screen title={title} description={description} scrollKey={scrollKey}>
      {children}
    </Screen>
  );
}
