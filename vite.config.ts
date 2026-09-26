import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    open: true,
  },
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "framer-motion",
              test: /framer-motion/,
            },
            {
              name: "react-zoom-pan-pinch",
              test: /react-zoom-pan-pinch/,
            },
            {
              name: "vendor",
              test: /\/node_modules\/(?:react|react-dom|jotai)\//,
            },
          ],
        },
      },
    },
  },
});
