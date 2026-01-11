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

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Resolve @project/* workspace packages to source for hot reload
// This maps package imports to their TypeScript source instead of dist/
const workspacePackages = {
  "@project/ui-tokens": path.resolve(monorepoRoot, "packages/@project/ui-tokens/src"),
  "@project/core": path.resolve(monorepoRoot, "packages/@project/core/src"),
  "@project/db": path.resolve(monorepoRoot, "packages/@project/db/src"),
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

config.resolver.resolveRequest = (context, moduleName, platform) => {
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
