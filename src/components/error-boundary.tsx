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

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-background1 p-8 text-center">
            <h2 className="font-medium text-xl">Something went wrong</h2>
            <p className="text-foreground2 text-sm">Please ping Ricky</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
