const { copyFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const { IOSConfig, withXcodeProject } = require("expo/config-plugins");

// WidgetKit localizes gallery metadata from the extension's bundle, before the app sends props.
module.exports = (config) =>
  withXcodeProject(config, (c) => {
    const project = c.modResults;
    const name = "ExpoWidgetsTarget";
    const target = project.findTargetKey(name);
    if (!target) throw new Error("Widget localizations require the expo-widgets target.");
    const file = "Localizable.xcstrings";
    const directory = path.join(c.modRequest.platformProjectRoot, name);
    mkdirSync(directory, { recursive: true });
    copyFileSync(
      path.join(c.modRequest.projectRoot, "assets/widgets/Localizable.xcstrings"),
      path.join(directory, "Localizable.xcstrings"),
    );
    const group = project.pbxGroupByName(name);
    if (!group.children.some((child) => child.comment === "Localizable.xcstrings")) {
      project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target);
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: file,
        groupName: name,
        project,
        isBuildFile: true,
        targetUuid: target,
      });
      // The xcode parser predates string catalogs, so Xcode needs their file type explicitly.
      const reference = project.pbxFileReferenceSection()[group.children.at(-1).value];
      reference.lastKnownFileType = "text.json.xcstrings";
    }
    return c;
  });
