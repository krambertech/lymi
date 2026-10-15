const { withXcodeProjectBeta } = require("@bacons/apple-targets/build/with-bacons-xcode");

// Sets LYMI_CONTROLS on the controls extension, so the intents it shares with the app compile
// there without the app's App Shortcuts (targets/controls/_shared/Shortcuts.swift). Listed before
// @bacons/apple-targets in app.json, so it runs after that plugin has made the target.
module.exports = (config) =>
  withXcodeProjectBeta(config, (c) => {
    const target = c.modResults.rootObject.props.targets.find(
      (t) => t.props.productName === "LymiControls",
    );
    if (!target) throw new Error("with-controls-flag: no LymiControls target");
    for (const build of target.props.buildConfigurationList.props.buildConfigurations) {
      build.props.buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS = "$(inherited) LYMI_CONTROLS";
    }
    return c;
  });
