import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("home.tsx"),
  route("writing/:locale/:slug", "article.tsx"),
  route("*", "not-found.tsx"),
] satisfies RouteConfig;
