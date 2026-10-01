import path from "node:path";
import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";
import { articlesPlugin } from "./tools/articles-plugin.ts";

const ARTICLE_MDX_PATTERN = /\.mdx$/;

// https://vite.dev/config/
export default defineConfig({
  build: {
    manifest: true,
  },
  plugins: [
    articlesPlugin(),
    {
      enforce: "pre",
      ...mdx({
        include: ARTICLE_MDX_PATTERN,
        rehypePlugins: [rehypeSlug],
        remarkPlugins: [remarkGfm],
      }),
    },
    reactRouter(),
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
});
