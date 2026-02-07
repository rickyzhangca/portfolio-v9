import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
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
    rollupOptions: {
      output: {
        advancedChunks: {
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
              name: "markdown",
              test: /react-markdown|react-shiki/,
            },
            {
              name: "vendor",
              test: /react|react-dom|jotai/,
            },
          ],
        },
      },
    },
  },
});
