const { withXcodeProjectBeta } = require("@bacons/apple-targets/build/with-bacons-xcode");
const { modifyExistingXcodeBuildScript } = require("posthog-react-native/expo");

function bundleScript(original) {
  const phase = { shellScript: JSON.stringify(original) };
  modifyExistingXcodeBuildScript(phase, false, "event");
  const upload = JSON.parse(phase.shellScript);
  if (upload === original)
    throw new Error("Phone source maps: React Native bundle command missing");
  // Gate at build time so local and EAS prebuilds keep the same native fingerprint.
  return `if [ "$EAS_BUILD" = "true" ] && [ "$CONFIGURATION" = "Release" ]; then
  if [ -z "$POSTHOG_CLI_API_KEY" ]; then
    echo "error: Phone source maps require POSTHOG_CLI_API_KEY in the EAS environment"
    exit 1
  fi
${upload}
else
${original}
fi`;
}

module.exports = (config) =>
  withXcodeProjectBeta(config, (c) => {
    const target = c.modResults.rootObject.props.targets.find(
      (target) => target.props.productType === "com.apple.product-type.application",
    );
    if (!target) throw new Error("Phone source maps: app target missing");
    const phases = target.props.buildPhases.filter(
      (phase) => phase.props.name === "Bundle React Native code and images",
    );
    if (phases.length !== 1) throw new Error("Phone source maps: expected one app bundle phase");
    const phase = phases[0].props;
    const original = phase.shellScript;
    if (!original.includes("Phone source maps require")) phase.shellScript = bundleScript(original);
    for (const build of target.props.buildConfigurationList.props.buildConfigurations) {
      if (build.props.name === "Release")
        build.props.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
    }
    return c;
  });

module.exports.bundleScript = bundleScript;
