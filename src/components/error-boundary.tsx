import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-white">
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <h2 className="mb-2 font-bold text-xl">Something went wrong</h2>
              <p className="text-sm opacity-70">
                Please try refreshing the page.
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
