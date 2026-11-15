import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
// Built by `pnpm build`, which `package` and `make` run first.
import { DOWNLOADS } from "./dist/downloads.js";

// Set only in the release job, which holds the Developer ID certificate and the notary key. README.md.
const signing = process.env.LYMI_SIGN === "1";

/**
 * The download: a window with Lymi.app beside a link to Applications over a background that says
 * what to do. Built with dmgbuild, which lays out the window without driving Finder, because
 * Forge's DMG maker needs native modules that pnpm does not build. README.md.
 */
function makeDmg(arch, version) {
  const dmg = resolve(`out/make/Lymi-${version}-${arch}.dmg`);
  execFileSync(process.env.DMGBUILD ?? "dmgbuild", [
    ...["-s", resolve("scripts/dmg.py")],
    ...["-D", `app=${resolve(`out/Lymi-darwin-${arch}/Lymi.app`)}`],
    ...["-D", `background=${resolve("assets/dmg-background.tiff")}`],
    "Lymi",
    dmg,
  ]);
  if (signing) execFileSync("codesign", ["--sign", "Developer ID Application", dmg]);
  return dmg;
}

/** @type {import("@electron-forge/shared-types").ForgeConfig} */
export default {
  packagerConfig: {
    name: "Lymi",
    executableName: "Lymi",
    appBundleId: "app.lymi.desktop",
    appCategoryType: "public.app-category.education",
    icon: "assets/icon",
    asar: true,
    // The app needs no package at run time, so the bundle holds only what it loads.
    prune: false,
    ignore: (path) => !!path && !/^\/(package\.json|dist|assets)(\/|$)/.test(path),
    protocols: [{ name: "Lymi sign-in", schemes: ["app.lymi.desktop"] }],
    // Developer ID Application from the keychain, with the hardened runtime notarization needs.
    osxSign: signing ? {} : undefined,
    osxNotarize: signing
      ? {
          appleApiKey: process.env.APPLE_API_KEY_PATH,
          appleApiKeyId: process.env.APPLE_API_KEY_ID,
          appleApiIssuer: process.env.APPLE_API_ISSUER,
        }
      : undefined,
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
      config: (arch) => ({ macUpdateManifestBaseUrl: `${DOWNLOADS}/darwin/${arch}` }),
    },
  ],
  hooks: {
    // Apple silicon runs nothing unsigned, so the pull request check's build is signed ad hoc.
    postPackage: async (_config, { outputPaths, platform }) => {
      if (signing || platform !== "darwin") return;
      for (const dir of outputPaths)
        execFileSync("codesign", ["--force", "--deep", "--sign", "-", `${dir}/Lymi.app`]);
    },
    postMake: async (_config, results) =>
      results.map((result) =>
        result.platform === "darwin"
          ? {
              ...result,
              artifacts: [...result.artifacts, makeDmg(result.arch, result.packageJSON.version)],
            }
          : result,
      ),
  },
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    }),
  ],
};
