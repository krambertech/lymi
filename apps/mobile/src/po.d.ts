/** `.po` catalogs compile on import through `@lingui/metro-transformer`. */
declare module "*.po" {
  import type { Messages } from "@lingui/core";
  export const messages: Messages;
}
