import type { ReactNode } from "react";
import { vi } from "vitest";

export interface MockTransformWrapperProps {
  children: ReactNode;
  className?: string;
  wrapperClass?: string;
  onTransformed?: (ref: MockTransformRef) => void;
  onZoomStart?: () => void;
  onZoomChange?: () => void;
  onZoomStop?: () => void;
  onPanningStart?: () => void;
  onPanning?: () => void;
  onPanningStop?: () => void;
}

export interface MockTransformRef {
  current: {
    state: {
      scale: number;
      positionX: number;
      positionY: number;
    };
    setTransform: (
      x: number,
      y: number,
      scale: number,
      duration?: number
    ) => void;
    instance: {
      transformState: {
        scale: number;
        positionX: number;
        positionY: number;
      };
    };
  };
}

export const mockTransformRef: MockTransformRef = {
  current: {
    state: { scale: 1, positionX: 0, positionY: 0 },
    setTransform: vi.fn(),
    instance: { transformState: { scale: 1, positionX: 0, positionY: 0 } },
  },
};

export const MockTransformWrapper = ({
  children,
  className,
  wrapperClass,
}: MockTransformWrapperProps) => {
  return <div className={className || wrapperClass}>{children}</div>;
};

export const MockTransformComponent = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <div className={className}>{children}</div>;
};
