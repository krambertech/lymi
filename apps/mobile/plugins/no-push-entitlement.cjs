const { withEntitlementsPlist } = require("expo/config-plugins");

// Reminders are local notifications, which need no entitlement. expo-notifications adds the push
// one anyway, and a free Apple team cannot sign a build that carries it.
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
