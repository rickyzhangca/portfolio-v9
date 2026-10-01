import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "src/test-utils/**",
        "src/assets/**",
        "src/content/**",
        "src/scenes/**",
        "src/types/**",
        "src/context/atoms.ts",
        "src/cards/types.ts",
        "src/components/ui/**",
        "src/cards/about/**",
        "src/cards/cover/**",
        "src/cards/email/**",
        "src/cards/macbook/**",
        "src/cards/profilepic/**",
        "src/cards/project/**",
        "src/cards/resume/**",
        "**/.DS_Store",
        "**/*.md",
        "**/*.d.ts",
        "**/*.config.*",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        branches: 65,
        functions: 60,
        lines: 80,
        statements: 80,
      },
    },
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "tools/**/*.test.ts"],
    setupFiles: ["./src/test-utils/vitest.setup.ts"],
  },
});
