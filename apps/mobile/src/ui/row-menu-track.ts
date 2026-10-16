import type { ContextMenuAction, ContextMenuSurface } from "@lymi/core/analytics";
import { captureEvent } from "../telemetry/posthog";

/** Records a long-press menu row taken, with where and which; never the row's content. */
export function trackRowMenu(surface: ContextMenuSurface, action: ContextMenuAction) {
  captureEvent("context_menu_action", { menu: surface, action });
}
