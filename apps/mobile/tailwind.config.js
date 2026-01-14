/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontSize: {
        // Mobile-optimized type scale (scaled up from Tailwind defaults)
        xs: ["14px", { lineHeight: "18px" }],   // default: 12px
        sm: ["16px", { lineHeight: "22px" }],   // default: 14px
        base: ["18px", { lineHeight: "26px" }], // default: 16px
        lg: ["20px", { lineHeight: "28px" }],   // default: 18px
        xl: ["24px", { lineHeight: "32px" }],   // default: 20px
        "2xl": ["28px", { lineHeight: "36px" }], // default: 24px
        "3xl": ["34px", { lineHeight: "42px" }], // default: 30px
        "4xl": ["40px", { lineHeight: "48px" }], // default: 36px
      },
      fontFamily: {
        noto: ["NotoSerif"],
        "noto-semibold": ["NotoSerif_SemiBold"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        placeholder: "var(--placeholder)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
