import type { ContextMenuAction, ContextMenuSurface } from "@lymi/core/analytics";
import { captureEvent } from "../telemetry/posthog";

export function trackRowMenu(surface: ContextMenuSurface, action: ContextMenuAction) {
  captureEvent("context_menu_action", { menu: surface, action });
}
