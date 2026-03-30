import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*"],
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
        "src/components/cards/**",
        "src/components/about/**",
        "src/components/resume/**",
        "src/cards/about/**",
        "src/cards/cover/**",
        "src/cards/email/**",
        "src/cards/macbook/**",
        "src/cards/profilepic/**",
        "src/cards/project/**",
        "src/cards/resume/**",
        "src/components/canvas/canvas.tsx",
        "src/components/canvas/single-card-item.tsx",
        "src/components/groups/card-group.tsx",
        "src/components/groups/swag-group.tsx",
        "**/.DS_Store",
        "**/*.md",
        "**/*.d.ts",
        "**/*.config.*",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 60,
        lines: 80,
      },
    },
  },
});
