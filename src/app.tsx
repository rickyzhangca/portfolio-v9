import { Canvas } from "@/components/canvas/canvas";
import { ErrorBoundary } from "@/components/error-boundary";
import { initialItems } from "@/scenes/home-scene";
import { TooltipProvider } from "./components/ui/tooltip";

export const App = () => {
  return (
    <ErrorBoundary>
      <TooltipProvider closeDelay={0} delay={0} timeout={0}>
        <Canvas initialItems={initialItems} />
      </TooltipProvider>
    </ErrorBoundary>
  );
};
