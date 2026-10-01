import type { Plugin } from "vite";
import { ARTICLE_DIRECTORY, generateArticles } from "./articles.ts";

export function articlesPlugin(): Plugin {
  return {
    buildStart() {
      generateArticles();
    },
    configureServer(server) {
      server.watcher.add(ARTICLE_DIRECTORY);
      const update = (file: string) => {
        if (!file.startsWith(ARTICLE_DIRECTORY)) {
          return;
        }
        try {
          generateArticles();
        } catch (error) {
          server.ws.send({
            err: { message: String(error), stack: "" },
            type: "error",
          });
        }
      };
      server.watcher.on("add", update);
      server.watcher.on("unlink", update);
      server.watcher.on("change", update);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", update);
        server.watcher.off("unlink", update);
        server.watcher.off("change", update);
      });
    },
    name: "portfolio-articles",
  };
}
