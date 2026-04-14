const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in monorepo
config.watchFolders = [workspaceRoot];

// Resolve packages from workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Required for pnpm: prevents Metro from finding a second copy of react/react-native
// in the workspace root's node_modules and causing "Invariant Violation" crashes
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
