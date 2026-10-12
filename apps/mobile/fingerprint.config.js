// The version is left out of the native fingerprint, so an over-the-air update can carry a new release identity (ADR 0032).
const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require("expo/fingerprint");

/** @type {import("expo/fingerprint").Config} */
module.exports = { sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigVersions };
