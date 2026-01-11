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

/**
 * Convert oklch color to hex (for React Native compatibility)
 * oklch(L C H) or oklch(L C H / A%)
 */
function oklchToHex(oklchStr: string): string {
  const match = oklchStr.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%?)?\s*\)/
  );
  if (!match) return oklchStr; // Return as-is if not oklch

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);
  const alpha = match[4] ? parseFloat(match[4]) / 100 : 1;

  // oklch to oklab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // oklab to linear RGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Linear RGB to sRGB (gamma correction)
  const toSrgb = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const rSrgb = Math.round(toSrgb(r) * 255);
  const gSrgb = Math.round(toSrgb(g) * 255);
  const bSrgb = Math.round(toSrgb(bVal) * 255);

  if (alpha < 1) {
    return `rgba(${rSrgb}, ${gSrgb}, ${bSrgb}, ${alpha.toFixed(2)})`;
  }

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(rSrgb)}${toHex(gSrgb)}${toHex(bSrgb)}`;
}

// Generate CSS variable declarations
function generateCSSVariables(
  tokens: Record<string, { light: string; dark: string }>,
  mode: "light" | "dark",
  convertColors = false
): string {
  return Object.entries(tokens)
    .map(([key, value]) => {
      const color = convertColors ? oklchToHex(value[mode]) : value[mode];
      return `  --${toKebabCase(key)}: ${color};`;
    })
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
// Converts oklch colors to hex/rgba for React Native compatibility
function generateMobileCSS(): string {
  const lightVars = [
    generateCSSVariables(colors, "light", true),
    `  --radius: ${radius.base};`,
  ].join("\n");

  const darkVars = generateCSSVariables(colors, "dark", true);

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
