const { withXcodeProjectBeta } = require("@bacons/apple-targets/build/with-bacons-xcode");
const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");
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

const GRADLE_MARKER = "// Phone source maps: docs/phone-release.md";

// PostHog's Gradle script uploads each release bundle's Hermes map; the gate runs at build time, as on iOS.
const gradleBlock = `${GRADLE_MARKER}
if (System.getenv("EAS_BUILD") == "true") {
    apply from: new File(["node", "--print", "require('path').join(require('path').dirname(require.resolve('posthog-react-native')), '..', 'tooling', 'posthog.gradle')"].execute(null, rootDir).text.trim())
    gradle.taskGraph.whenReady { graph ->
        def bundles = graph.allTasks.any { it.name ==~ /(createBundle|bundle)\\w*JsAndAssets/ && !it.name.contains("Debug") }
        if (bundles && !System.getenv("POSTHOG_CLI_API_KEY")) {
            throw new GradleException("Phone source maps require POSTHOG_CLI_API_KEY in the EAS environment")
        }
    }
}
`;

function appBuildGradle(contents) {
  if (contents.includes(GRADLE_MARKER)) return contents;
  return `${contents.trimEnd()}\n\n${gradleBlock}`;
}

const gradleProperties = (properties) => [
  ...properties.filter((item) => item.key !== "posthog.hermesReleaseMode"),
  { type: "property", key: "posthog.hermesReleaseMode", value: "event" },
];

function withAndroidSourceMaps(config) {
  const gradle = withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== "groovy")
      throw new Error("Phone source maps: app build.gradle is not Groovy");
    c.modResults.contents = appBuildGradle(c.modResults.contents);
    return c;
  });
  return withGradleProperties(gradle, (c) => {
    c.modResults = gradleProperties(c.modResults);
    return c;
  });
}

const withIosSourceMaps = (config) =>
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

module.exports = (config) => withAndroidSourceMaps(withIosSourceMaps(config));
module.exports.bundleScript = bundleScript;
module.exports.appBuildGradle = appBuildGradle;
module.exports.gradleProperties = gradleProperties;
