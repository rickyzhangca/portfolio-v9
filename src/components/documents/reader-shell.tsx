import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import {
  AnimatePresence,
  motion,
  type Transition,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SPRING_PRESETS } from "@/lib/animation";
import { tw } from "@/lib/utils";

interface ReaderShellProps {
  actions?: ReactNode;
  backdropExitDelay?: number;
  backdropTransition?: Transition;
  children: ReactNode;
  className?: string;
  clipDuringLayout?: boolean;
  isOpen: boolean;
  layoutId?: string;
  onClose: (method?: "button" | "keyboard" | "outside_click") => void;
  onExitComplete?: () => void;
  paperAspectRatio?: number;
  title: string;
}

export function ReaderShell({
  isOpen,
  onExitComplete,
  ...props
}: ReaderShellProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen ? <ReaderDialog key="reader" {...props} /> : null}
    </AnimatePresence>
  );
}

function ReaderDialog({
  onClose,
  title,
  children,
  actions,
  backdropExitDelay = 0.12,
  backdropTransition = { duration: 0.32 },
  layoutId,
  className,
  clipDuringLayout = false,
  paperAspectRatio,
}: Omit<ReaderShellProps, "isOpen" | "onExitComplete">) {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const wasPresentRef = useRef(isPresent);
  useLayoutEffect(() => {
    // A canceled exit reuses the open dialog, so Base UI's initialFocus won't rerun.
    if (isPresent && !wasPresentRef.current) {
      viewportRef.current?.focus({ preventScroll: true });
    }
    wasPresentRef.current = isPresent;
  }, [isPresent]);
  const handleOpenChange = useCallback(
    (open: boolean, details: Dialog.Root.ChangeEventDetails) => {
      if (!open && isPresent) {
        let method: "button" | "keyboard" | "outside_click" = "button";
        if (details.reason === "escape-key") {
          details.event.stopPropagation();
          method = "keyboard";
        }
        if (details.reason === "outside-press") {
          method = "outside_click";
        }
        onClose(method);
      }
    },
    [isPresent, onClose]
  );
  const handleBackgroundClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        isPresent &&
        event.target === event.currentTarget &&
        event.clientX < event.currentTarget.clientWidth
      ) {
        onClose("outside_click");
      }
    },
    [isPresent, onClose]
  );
  return (
    // Retain the projection for exit, but release modal isolation immediately.
    <Dialog.Root
      disablePointerDismissal={!isPresent}
      modal={isPresent}
      onOpenChange={handleOpenChange}
      open
    >
      <Dialog.Portal data-no-collapse keepMounted>
        <Dialog.Popup
          aria-modal={isPresent || undefined}
          className="fixed inset-0 z-50 bg-white outline-none"
          inert={!isPresent}
          initialFocus={viewportRef}
          render={
            <motion.div
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: {
                  ...(reducedMotion ? { duration: 0 } : backdropTransition),
                  delay: reducedMotion ? 0 : backdropExitDelay,
                },
              }}
              initial={{ opacity: reducedMotion ? 1 : 0 }}
              layoutRoot
              transition={reducedMotion ? { duration: 0 } : backdropTransition}
            />
          }
          style={{ pointerEvents: isPresent ? "auto" : "none" }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <motion.div
            className={tw(
              "absolute inset-0 overscroll-contain px-5 pt-12 pb-24 outline-none",
              clipDuringLayout ? "overflow-y-scroll" : "overflow-y-auto"
            )}
            data-reader-viewport
            layoutScroll
            onClick={handleBackgroundClick}
            ref={viewportRef}
            tabIndex={-1}
          >
            <ReaderPaper
              className={className}
              clipDuringLayout={clipDuringLayout}
              layoutId={layoutId}
              paperAspectRatio={paperAspectRatio}
              reducedMotion={!!reducedMotion}
            >
              <div
                className={tw(
                  "pb-24",
                  clipDuringLayout &&
                    paperAspectRatio &&
                    "absolute top-0 left-0 w-full"
                )}
              >
                {children}
              </div>
            </ReaderPaper>
          </motion.div>
          <motion.div
            animate={{
              boxShadow: "0 12px 24px -12px rgba(0,0,0,0.48)",
              x: "-50%",
              y: 0,
            }}
            className="fixed bottom-6 left-1/2 flex items-center overflow-hidden rounded-full bg-foreground1/80 text-white backdrop-blur"
            exit={{
              boxShadow: "0 0 0 rgba(0,0,0,0)",
              transition: { duration: reducedMotion ? 0 : 0.24 },
              x: "-50%",
              y: "200%",
            }}
            initial={{
              boxShadow: "0 0 0 rgba(0,0,0,0)",
              x: "-50%",
              y: reducedMotion ? 0 : "200%",
            }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    boxShadow: { duration: 0.24 },
                    y: { ...SPRING_PRESETS.smooth, delay: 0.16 },
                  }
            }
          >
            <Dialog.Close
              aria-label="Close reader"
              className="flex cursor-pointer items-center gap-2 px-6 py-4 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
              type="button"
            >
              <ArrowLeftIcon size={20} weight="bold" />
            </Dialog.Close>
            {actions}
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ReaderPaper({
  children,
  className,
  clipDuringLayout,
  layoutId,
  paperAspectRatio,
  reducedMotion,
}: Pick<
  ReaderShellProps,
  | "children"
  | "className"
  | "clipDuringLayout"
  | "layoutId"
  | "paperAspectRatio"
> & { reducedMotion: boolean }) {
  const isPresent = useIsPresent();
  const [isAnimating, setAnimating] = useState(false);
  const startAnimation = useCallback(() => {
    if (clipDuringLayout) {
      setAnimating(true);
    }
  }, [clipDuringLayout]);
  const finishAnimation = useCallback(() => setAnimating(false), []);
  return (
    <motion.div
      className={tw(
        "relative mx-auto w-full max-w-210 bg-white",
        clipDuringLayout && (isAnimating || !isPresent) && "overflow-hidden",
        className
      )}
      layoutId={reducedMotion ? undefined : layoutId}
      onLayoutAnimationComplete={finishAnimation}
      onLayoutAnimationStart={startAnimation}
      // Keep the projection in the card's proportions. Reveal the long body
      // after arrival so it cannot paint outside the growing paper frame.
      style={{
        aspectRatio: clipDuringLayout ? paperAspectRatio : undefined,
        borderRadius: clipDuringLayout ? 0 : undefined,
        height:
          !clipDuringLayout && paperAspectRatio
            ? `calc(min(840px, 100vw - 40px) / ${paperAspectRatio})`
            : undefined,
      }}
      transition={reducedMotion ? { duration: 0 } : SPRING_PRESETS.smooth}
    >
      {children}
    </motion.div>
  );
}
