/** The paths that open the phone app, where it has a screen for them; everything else stays on the web. */
export const APP_LINK_PATHS = ["/join/*", "/add/*"] as const;

/** The phone app's Android package, as `android.package` in `apps/mobile/app.json` names it. */
export const ANDROID_PACKAGE = "app.lymi";

export function appSiteAssociation(appID: string) {
  return {
    applinks: {
      details: [{ appIDs: [appID], components: APP_LINK_PATHS.map((path) => ({ "/": path })) }],
    },
  };
}

/**
 * Android's Digital Asset Links statement. Which paths open the app is the manifest's intent
 * filter; this file only vouches that the signing certificates belong to this host.
 */
export function assetLinks(fingerprints: string) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: fingerprints
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      },
    },
  ];
}
