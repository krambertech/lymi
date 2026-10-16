const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

// The iOS 27 SDK stops an app at launch unless it adopts the scene life cycle. SDK 57's template has
// no scene delegate, so this gives the app SDK 58's: ExpoAppSceneDelegate makes the window, starts
// React Native and forwards links, user activities and quick actions to the app delegate. Delete it
// with the upgrade to SDK 58.

const SCENE_DELEGATE = `internal import Expo
internal import ExpoModulesCore
internal import ExpoQuickActions
import UIKit

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    // expo-quick-actions reads the launching action only from launch options, which scenes leave empty.
    if let item = connectionOptions.shortcutItem {
      for case let quickActions as ExpoQuickActionsAppDelegate in ExpoAppDelegateSubscriberRepository.subscribers {
        _ = quickActions.application(UIApplication.shared, didFinishLaunchingWithOptions: [.shortcutItem: item])
      }
    }
    super.scene(scene, willConnectTo: session, options: connectionOptions)
  }
}
`;

// Each edit turns SDK 57's AppDelegate into SDK 58's; one that finds nothing means the template moved.
const APP_DELEGATE_EDITS = [
  [
    "class AppDelegate: ExpoAppDelegate {",
    "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
  ],
  [/\n#if os\(iOS\) \|\| os\(tvOS\)\n {4}window = UIWindow[\s\S]*?#endif\n/, ""],
  [
    /\n {2}\/\/ Linking API\n[\s\S]*?\/\/ Universal Links\n[\s\S]*?return super\.application[^\n]*\n {2}\}\n/,
    "",
  ],
];

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift")
      throw new Error("with-scene-delegate: AppDelegate is not Swift");
    let contents = c.modResults.contents;
    if (contents.includes("ExpoReactNativeFactoryProvider")) return c;
    for (const [from, to] of APP_DELEGATE_EDITS) {
      const next = contents.replace(from, to);
      if (next === contents) throw new Error(`with-scene-delegate: AppDelegate has no ${from}`);
      contents = next;
    }
    c.modResults.contents = contents;
    return c;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return c;
  });

const withSceneDelegateFile = (config) =>
  withXcodeProject(config, (c) => {
    const { projectName, platformProjectRoot } = c.modRequest;
    writeFileSync(join(platformProjectRoot, projectName, "SceneDelegate.swift"), SCENE_DELEGATE);
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SceneDelegate.swift`,
      groupName: projectName,
      project: c.modResults,
    });
    return c;
  });

module.exports = (config) => withSceneDelegateFile(withSceneManifest(withSceneAppDelegate(config)));
