import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches runtime errors anywhere below it so a thrown component does not
 * produce a blank white screen — surfaces the message + a retry button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[Lemberg] runtime error:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink-900)] px-6 py-20 text-[var(--color-bone-100)]">
          <div className="max-w-lg text-center">
            <span className="label-eyebrow text-[var(--color-wine-500)]">Application error</span>
            <h1 className="mt-4 font-display text-4xl font-light italic text-[var(--color-pearl-300)]">
              Something poured wrong.
            </h1>
            <p className="mt-6 body-editorial text-[var(--color-bone-300)]">
              The page hit an unexpected condition. The details are in the browser console.
            </p>
            <pre className="mt-6 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-[var(--border-subtle)] bg-[var(--color-ink-850)] px-4 py-3 text-left text-[12px] text-[var(--color-bone-400)]">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={this.reset}
              className="mt-8 inline-flex items-center gap-3 border border-[var(--color-bone-300)]/40 px-7 py-3 label-eyebrow text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
