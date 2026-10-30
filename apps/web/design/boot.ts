import { configureWebClient } from "../src/client/lib/client";
import { activate } from "../src/client/lib/i18n";
import { initTheme } from "../src/client/lib/theme";

/**
 * What the product's entry point sets up before it renders, so a specimen finds the same runtime
 * here: Review's example speaker resolves its clip's URL from the API client while it renders.
 */
export function bootDesign() {
  activate("en");
  configureWebClient();
  initTheme();
}
