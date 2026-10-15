const { withEntitlementsPlist } = require("expo/config-plugins");

// Join and add links on my.lymi.app open the app once the Worker's apple-app-site-association names
// its Team ID. A free Apple team cannot sign Associated Domains, so only EAS builds, which sign
// with the paid team, carry it; LYMI_APP_LINKS=1 adds it to a local build.
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    if (process.env.EAS_BUILD === "true" || process.env.LYMI_APP_LINKS === "1") {
      c.modResults["com.apple.developer.associated-domains"] = ["applinks:my.lymi.app"];
    }
    return c;
  });
