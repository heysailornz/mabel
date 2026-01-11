/**
 * Generate platform-specific CSS files from shared tokens
 *
 * Usage: pnpm generate
 */
import * as fs from "fs";
import * as path from "path";
import { colors, chartColors, sidebarColors } from "./colors";
import { radius } from "./radius";

// Convert camelCase to kebab-case
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// Generate CSS variable declarations
function generateCSSVariables(
  tokens: Record<string, { light: string; dark: string }>,
  mode: "light" | "dark"
): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  --${toKebabCase(key)}: ${value[mode]};`)
    .join("\n");
}

// Generate web CSS (full version with all tokens)
function generateWebCSS(): string {
  const lightVars = [
    generateCSSVariables(colors, "light"),
    generateCSSVariables(chartColors, "light"),
    generateCSSVariables(sidebarColors, "light"),
    `  --radius: ${radius.base};`,
  ].join("\n");

  const darkVars = [
    generateCSSVariables(colors, "dark"),
    generateCSSVariables(chartColors, "dark"),
    generateCSSVariables(sidebarColors, "dark"),
  ].join("\n");

  return `/**
 * Auto-generated CSS variables from @project/ui-tokens
 * DO NOT EDIT DIRECTLY - run 'pnpm --filter @project/ui-tokens generate'
 */

:root {
${lightVars}
}

.dark {
${darkVars}
}
`;
}

// Generate mobile CSS (core tokens only, optimized for React Native)
function generateMobileCSS(): string {
  const lightVars = [
    generateCSSVariables(colors, "light"),
    `  --radius: ${radius.base};`,
  ].join("\n");

  const darkVars = generateCSSVariables(colors, "dark");

  return `/**
 * Auto-generated CSS variables from @project/ui-tokens
 * DO NOT EDIT DIRECTLY - run 'pnpm --filter @project/ui-tokens generate'
 *
 * For use with NativeWind in React Native/Expo
 */

:root {
${lightVars}
}

.dark {
${darkVars}
}
`;
}

// Main generation function
function main() {
  const generatedDir = path.join(__dirname, "..", "generated");

  // Ensure generated directory exists
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Generate web.css
  const webCSS = generateWebCSS();
  fs.writeFileSync(path.join(generatedDir, "web.css"), webCSS, "utf-8");
  console.log("Generated: generated/web.css");

  // Generate mobile.css
  const mobileCSS = generateMobileCSS();
  fs.writeFileSync(path.join(generatedDir, "mobile.css"), mobileCSS, "utf-8");
  console.log("Generated: generated/mobile.css");

  console.log("\nToken generation complete!");
}

main();
