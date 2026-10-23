const { withXcodeProject } = require("expo/config-plugins");
const { withXcodeProjectBeta } = require("@bacons/apple-targets/build/with-bacons-xcode");

// The app is iPhone-only (supportsTablet false), but both extension plugins hard-code iPhone and
// iPad, so this makes every extension match. Listed before expo-widgets and @bacons/apple-targets
// in app.json, so it runs after they have made their targets.
const IPHONE = "1";

const withWidgetTarget = (config) =>
  withXcodeProject(config, (c) => {
    const project = c.modResults;
    const key = project.findTargetKey("ExpoWidgetsTarget");
    if (!key) throw new Error("with-iphone-only: no ExpoWidgetsTarget target");
    const list = project.pbxNativeTargetSection()[key].buildConfigurationList;
    const configurations = project.pbxXCConfigurationList()[list].buildConfigurations;
    const builds = project.pbxXCBuildConfigurationSection();
    for (const { value } of configurations) {
      builds[value].buildSettings.TARGETED_DEVICE_FAMILY = IPHONE;
    }
    return c;
  });

const withAppleTargets = (config) =>
  withXcodeProjectBeta(config, (c) => {
    for (const name of ["LymiShare", "LymiControls"]) {
      const target = c.modResults.rootObject.props.targets.find(
        (t) => t.props.productName === name,
      );
      if (!target) throw new Error(`with-iphone-only: no ${name} target`);
      for (const build of target.props.buildConfigurationList.props.buildConfigurations) {
        build.props.buildSettings.TARGETED_DEVICE_FAMILY = IPHONE;
      }
    }
    return c;
  });

module.exports = (config) => withAppleTargets(withWidgetTarget(config));
