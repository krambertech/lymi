/** The paths that open the phone app, where it has a screen for them; everything else stays on the web. */
export const APP_LINK_PATHS = ["/join/*", "/add/*"] as const;

export function appSiteAssociation(appID: string) {
  return {
    applinks: {
      details: [{ appIDs: [appID], components: APP_LINK_PATHS.map((path) => ({ "/": path })) }],
    },
  };
}
