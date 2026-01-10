import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/web/server.ts",
    "src/web/client.ts",
    "src/web/middleware.ts",
    "src/mobile/index.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: [
    "next",
    "next/headers",
    "next/server",
    "expo-secure-store",
    "@supabase/supabase-js",
    "@supabase/ssr",
  ],
});
