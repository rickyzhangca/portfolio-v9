import { Link, type MetaFunction } from "react-router";
import { SITE_NAME } from "@/lib/site";

export const meta: MetaFunction = () => [
  { title: `Page not found — ${SITE_NAME}` },
  { content: "noindex", name: "robots" },
];

export default function NotFoundRoute() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-medium text-3xl">Page not found</h1>
      <Link className="underline underline-offset-4" to="/">
        Return to portfolio
      </Link>
    </main>
  );
}
