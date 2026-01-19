import { Canvas } from "@/components/canvas/canvas";
import { ErrorBoundary } from "@/components/error-boundary";
import { data } from "@/data/data";

export const App = () => {
  return (
    <ErrorBoundary>
      <Canvas initialItems={data} />
    </ErrorBoundary>
  );
};
