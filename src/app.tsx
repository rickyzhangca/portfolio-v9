import { useState } from "react";
import { Canvas } from "@/components/canvas/canvas";
import { ReaderPaperLayout } from "@/components/documents/reader-paper-layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { getCanvasLayout } from "@/lib/canvas-layout";
import { getHomeScene } from "@/scenes/home-scene";

export const App = () => {
  // Fixed for the session: the scene and the layout rules must agree.
  const [{ items, layout }] = useState(() => ({
    items: getHomeScene(window.innerWidth),
    layout: getCanvasLayout(window.innerWidth),
  }));
  return (
    <ErrorBoundary>
      <ReaderPaperLayout>
        <Canvas initialItems={items} layout={layout} />
      </ReaderPaperLayout>
    </ErrorBoundary>
  );
};
