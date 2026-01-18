import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Safe Content</div>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe Content")).toBeDefined();
  });

  it("catches errors and renders default fallback UI", () => {
    const originalError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Please try refreshing the page.")).toBeDefined();

    console.error = originalError;
  });

  it("renders custom fallback when provided", () => {
    const originalError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary fallback={<div>Custom Error</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom Error")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();

    console.error = originalError;
  });

  it("updates state via getDerivedStateFromError", () => {
    const originalError = console.error;
    console.error = vi.fn();

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe Content")).toBeDefined();

    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    console.error = originalError;
  });
});
