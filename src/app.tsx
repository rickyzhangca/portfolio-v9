import { Canvas } from "@/components/canvas/canvas";
import { ErrorBoundary } from "@/components/error-boundary";
import { initialItems } from "@/scenes/home-scene";

export const App = () => {
  return (
    <ErrorBoundary>
      <Canvas initialItems={initialItems} />
    </ErrorBoundary>
  );
};
