const { withEntitlementsPlist } = require("expo/config-plugins");

// Join and add links on my.lymi.app open the app once the Worker's apple-app-site-association names
// its Team ID. A free Apple team cannot sign Associated Domains, so only builds with LYMI_APP_LINKS=1
// carry it. eas.json sets it, because EAS_BUILD is unset where eas-cli syncs capabilities.
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    if (process.env.LYMI_APP_LINKS === "1") {
      c.modResults["com.apple.developer.associated-domains"] = ["applinks:my.lymi.app"];
    }
    return c;
  });
