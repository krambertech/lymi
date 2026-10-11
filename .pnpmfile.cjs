/**
 * The Worker imports only @better-auth/expo's server plugin. Left in place, its optional Expo peers
 * resolve a second React Native tree on the web's Babel 8, and the phone's bundler finds that one
 * through the hoisted store. The phone depends on each of them itself, so it still resolves them.
 */
const EXPO_PEERS = [
  "expo-constants",
  "expo-linking",
  "expo-network",
  "expo-secure-store",
  "expo-web-browser",
];

function readPackage(pkg) {
  if (pkg.name !== "@better-auth/expo") return pkg;
  for (const name of EXPO_PEERS) {
    delete pkg.peerDependencies?.[name];
    delete pkg.peerDependenciesMeta?.[name];
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
