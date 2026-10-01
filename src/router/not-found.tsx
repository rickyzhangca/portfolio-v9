import { Link } from "react-router";

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
