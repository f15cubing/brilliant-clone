import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in its subtree so one bad component can't blank the
 * whole page. Shows a small message and keeps the rest of the app mounted.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="rounded-sm border border-vermilion/40 bg-vermilion/10 p-3 font-serif text-sm text-vermilion">
            Something went wrong rendering this view.{" "}
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="underline"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
