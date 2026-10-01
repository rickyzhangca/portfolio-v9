import { Canvas } from "@/components/canvas/canvas";
import { ReaderPaperLayout } from "@/components/documents/reader-paper-layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { initialItems } from "@/scenes/home-scene";
import { TooltipProvider } from "./components/ui/tooltip";

export const App = () => (
  <ErrorBoundary>
    <TooltipProvider closeDelay={0} delay={0} timeout={0}>
      <ReaderPaperLayout>
        <Canvas initialItems={initialItems} />
      </ReaderPaperLayout>
    </TooltipProvider>
  </ErrorBoundary>
);
