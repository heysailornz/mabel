# Theming & Styling

## Overview

The project uses a shared design token approach with CSS variables, but with platform-specific implementations:

| Platform | Framework | Tailwind Version | Color Format | Component Library |
|----------|-----------|------------------|--------------|-------------------|
| Web | Tailwind CSS | v4 | OKLCH | shadcn/ui |
| Mobile | NativeWind | v3-style | Hex | React Native Reusables |

Both platforms use the same CSS variable names (`--background`, `--primary`, etc.) enabling consistent theming patterns, though the actual color values differ slightly between platforms.

## Color Palette

The design uses an "ash grey" palette - muted greens/sage tones that work well for a medical/professional application.

### Base Palette (Mobile Hex Values)

```css
--color-ash-grey-50: #f2f4f0;   /* Lightest - backgrounds */
--color-ash-grey-100: #e6eae1;
--color-ash-grey-200: #ccd5c3;
--color-ash-grey-300: #b3c0a5;
--color-ash-grey-400: #99aa88;
--color-ash-grey-500: #80956a;
--color-ash-grey-600: #667755;
--color-ash-grey-700: #4d5a3f;
--color-ash-grey-800: #333c2a;
--color-ash-grey-900: #1a1e15;
--color-ash-grey-950: #12150f;  /* Darkest - dark mode bg */
```

## Web Theming

### Configuration

Web uses Tailwind CSS v4 with CSS-based configuration (no `tailwind.config.ts`).

**Key Files:**
- `apps/web/app/globals.css` - Theme definition and CSS variables
- `apps/web/components.json` - shadcn/ui configuration

### CSS Structure

```css
/* Tailwind v4 import */
@import "tailwindcss";

/* Dark mode variant */
@custom-variant dark (&:is(.dark *));

/* Theme tokens - maps CSS vars to Tailwind utilities */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... etc */
}

/* Light mode values */
:root {
  --background: oklch(96.45% 0.006 128.53);
  --foreground: oklch(22.76% 0.018 127.26);
  /* ... */
}

/* Dark mode values */
.dark {
  --background: oklch(19.02% 0.013 129.23);
  --foreground: oklch(96.45% 0.006 128.53);
  /* ... */
}
```

### Web-Specific Variables

Web includes additional variables not used in mobile:

- **Sidebar colors**: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, etc.
- **Chart colors**: `--chart-1` through `--chart-5`
- **Custom fonts**: `--font-sans`, `--font-mono`, `--font-serif`

### OKLCH Color Format

Web uses OKLCH for better perceptual uniformity and color manipulation:

```css
/* Format: oklch(lightness chroma hue) */
--primary: oklch(34.21% 0.033 129.59);
```

## Mobile Theming

### Configuration

Mobile uses NativeWind (Tailwind for React Native) with traditional v3-style configuration.

**Key Files:**
- `apps/mobile/global.css` - CSS variables
- `apps/mobile/tailwind.config.js` - Tailwind configuration
- `apps/mobile/components.json` - React Native Reusables configuration
- `apps/mobile/metro.config.js` - Wrapped with `withNativeWind`

### Tailwind Config

```javascript
// apps/mobile/tailwind.config.js
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        // ... maps CSS vars to Tailwind colors
      },
    },
  },
};
```

### CSS Variables

```css
/* apps/mobile/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f2f4f0;
  --foreground: #1a1e15;
  --primary: #12150f;
  --primary-foreground: #f2f4f0;
  /* ... */
}

.dark {
  --background: #12150f;
  --foreground: #f2f4f0;
  /* ... */
}
```

### Custom Fonts

Mobile includes Noto Serif for body text:

```javascript
fontFamily: {
  noto: ["NotoSerif"],
  "noto-semibold": ["NotoSerif_SemiBold"],
},
```

## Shared CSS Variables

Both platforms use these semantic color variables:

| Variable | Purpose |
|----------|---------|
| `--background` | Page/screen background |
| `--foreground` | Primary text color |
| `--card` | Card background |
| `--card-foreground` | Card text |
| `--popover` | Popover/dropdown background |
| `--popover-foreground` | Popover text |
| `--primary` | Primary brand color |
| `--primary-foreground` | Text on primary |
| `--secondary` | Secondary/muted backgrounds |
| `--secondary-foreground` | Text on secondary |
| `--muted` | Muted backgrounds |
| `--muted-foreground` | Muted/placeholder text |
| `--accent` | Accent backgrounds |
| `--accent-foreground` | Text on accent |
| `--destructive` | Error/danger color |
| `--border` | Border color |
| `--input` | Input border color |
| `--placeholder` | Input placeholder text |
| `--ring` | Focus ring color |
| `--radius` | Base border radius |

## Dark Mode

### Web

Dark mode is toggled by adding the `.dark` class to the document root. The `@custom-variant` directive enables `dark:` utility classes:

```css
@custom-variant dark (&:is(.dark *));
```

### Mobile

NativeWind supports dark mode via the `.dark` class on the root view. Use the `useColorScheme` hook from React Native or NativeWind to detect/toggle.

```tsx
import { useColorScheme } from "nativewind";

function App() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  // ...
}
```

## Component Libraries

### Web: shadcn/ui

- Style: `new-york`
- RSC enabled: `true`
- Icon library: `lucide`

```bash
# Add components
npx shadcn@latest add button card input
```

### Mobile: React Native Reusables

- Style: `new-york`
- RSC enabled: `false`

```bash
# Add components
cd apps/mobile
npx @react-native-reusables/cli@latest add button card input text
```

## Usage Examples

### Web Component

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardContent className="p-6">
        <Button variant="default">Primary Action</Button>
        <Button variant="secondary">Secondary</Button>
      </CardContent>
    </Card>
  );
}
```

### Mobile Component

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export function MyComponent() {
  return (
    <Card className="rounded-3xl">
      <CardContent className="p-6 gap-4">
        <Button>
          <Text>Primary Action</Text>
        </Button>
        <Button variant="secondary">
          <Text>Secondary</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Modifying the Theme

### Changing Colors

1. Update the CSS variables in both:
   - `apps/web/app/globals.css`
   - `apps/mobile/global.css`

2. Keep the variable names consistent between platforms

3. For web, you may want to use a tool to convert hex to OKLCH, or vice versa

### Adding New Variables

1. Add the CSS variable to both platform CSS files
2. Web: Add to the `@theme inline` block in `globals.css`
3. Mobile: Add to `theme.extend.colors` in `tailwind.config.js`

## Notes

- The slight color value differences between platforms are intentional - OKLCH provides better color accuracy on modern displays while hex is more portable for React Native
- Both platforms should maintain visual consistency despite using different color formats
- When updating the palette, test on both platforms to ensure consistency
