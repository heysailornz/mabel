const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Allow following symlinks for pnpm
config.resolver.unstable_enableSymlinks = true;

// 4. Resolve @project/* workspace packages to source for hot reload
// This maps package imports to their TypeScript source instead of dist/
const workspacePackages = {
  "@project/core": path.resolve(monorepoRoot, "packages/@project/core/src"),
  "@project/db": path.resolve(monorepoRoot, "packages/@project/db/src"),
  "@project/hooks": path.resolve(monorepoRoot, "packages/@project/hooks/src"),
  "@project/config": path.resolve(monorepoRoot, "packages/@project/config"),
};

// Helper to resolve a subpath - checks for directory/index.ts or direct .ts file
function resolveSubpath(srcPath, subpath) {
  // Try as directory with index.ts first
  const dirIndexPath = path.join(srcPath, subpath, "index.ts");
  if (fs.existsSync(dirIndexPath)) {
    return dirIndexPath;
  }
  // Try as direct .ts file
  const filePath = path.join(srcPath, subpath + ".ts");
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  // Fallback to .ts file path (let Metro handle the error if it doesn't exist)
  return filePath;
}

// 5. Ensure React is always resolved from the mobile app's node_modules
// This prevents "Cannot read property 'useState' of null" errors from multiple React copies
const reactPath = path.resolve(projectRoot, "node_modules/react");
const reactNativePath = path.resolve(projectRoot, "node_modules/react-native");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force React and React Native to always resolve from mobile app
  if (moduleName === "react") {
    return {
      filePath: path.join(reactPath, "index.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "react-native") {
    return {
      filePath: path.join(reactNativePath, "index.js"),
      type: "sourceFile",
    };
  }

  // Check if this is a workspace package import
  for (const [pkg, srcPath] of Object.entries(workspacePackages)) {
    if (moduleName === pkg) {
      return {
        filePath: path.join(srcPath, "index.ts"),
        type: "sourceFile",
      };
    }
    // Handle subpath imports like @project/core/auth
    if (moduleName.startsWith(pkg + "/")) {
      const subpath = moduleName.slice(pkg.length + 1);
      return {
        filePath: resolveSubpath(srcPath, subpath),
        type: "sourceFile",
      };
    }
  }
  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
