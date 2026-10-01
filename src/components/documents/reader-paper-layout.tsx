import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const ReaderPaperWidthContext = createContext(840);

/** Measure the reader's reserved scrollbar gutter once for all canvas papers. */
export function ReaderPaperLayout({ children }: { children: ReactNode }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(840);
  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) {
      return;
    }
    const updateWidth = (nextWidth: number) => {
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    };
    const measureWidth = () => updateWidth(paper.offsetWidth);
    measureWidth();
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        updateWidth(
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width
        );
      }
    });
    observer.observe(paper);
    window.addEventListener("resize", measureWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureWidth);
    };
  }, []);
  return (
    <ReaderPaperWidthContext.Provider value={width}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-px overflow-y-scroll px-5 opacity-0"
      >
        <div className="mx-auto h-px w-full max-w-210" ref={paperRef} />
      </div>
      {children}
    </ReaderPaperWidthContext.Provider>
  );
}

export function useReaderPaperWidth() {
  return useContext(ReaderPaperWidthContext);
}
