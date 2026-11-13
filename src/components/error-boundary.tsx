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
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error logging is handled externally
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-background1 flex h-full w-full flex-col items-center justify-center gap-1 p-8 text-center">
            <h2 className="text-xl font-medium">Something went wrong</h2>
            <p className="text-foreground2 text-sm">Please ping Ricky</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
