import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

const STREAM_TIMEOUT = 5000;

// With `ssr: false` this only runs for prerendering and the dev server. The
// default entry waits for Suspense boundaries only for bot user agents, so
// prerendered articles shipped their body as a hidden streamed segment behind
// a "Loading article…" fallback. Wait for everything so static HTML is complete
// for crawlers, link previews and readers without JavaScript. React also
// outlines completed boundaries above `progressiveChunkSize` (about 12 KB), so
// lift that limit to keep long articles inline.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }
  let status = responseStatusCode;
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        status = 500;
        console.error(error);
      },
      progressiveChunkSize: Number.POSITIVE_INFINITY,
      signal: AbortSignal.timeout(STREAM_TIMEOUT + 1000),
    }
  );
  await body.allReady;
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, { headers: responseHeaders, status });
}
