import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { CodeHighlighter } from "./code-highlighter";

// The grammar loads asynchronously; awaiting act lets the suspended render retry.
const renderHighlighter = (language: string, code: string) =>
  act(() =>
    render(
      <Suspense fallback={<pre>loading</pre>}>
        <CodeHighlighter code={code} language={language} />
      </Suspense>
    )
  );

describe("CodeHighlighter", () => {
  it("colours tokens for a supported grammar", async () => {
    const { container } = await renderHighlighter(
      "typescript",
      "const zap = 1;"
    );

    expect(await screen.findByText("zap", { exact: false })).toBeTruthy();
    const coloured = container.querySelectorAll('pre span[style*="color"]');
    expect(coloured.length).toBeGreaterThan(1);
  });

  it("renders an unknown language as plain text", async () => {
    await renderHighlighter("brainfuck", "+[----->+++<]>+.");

    expect(await screen.findByText("+[----->+++<]>+.")).toBeTruthy();
  });
});
