import { Component, type ReactNode } from "react";

type State = { error: Error | null };

/// Catches render-time exceptions so a single bad component or wasm
/// boundary error doesn't blank the whole app. Async errors (rejected
/// promises) still need their own try/catch — error boundaries don't see
/// them — but anything thrown synchronously during render lands here.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="panel border-loss/40 p-6">
            <h2 className="text-lg font-semibold text-loss">
              Something broke.
            </h2>
            <p className="mt-2 text-sm text-ink-dim">
              The UI hit an exception and has stopped rendering. Open the
              browser devtools console for the stack trace, then reload.
            </p>
            <pre className="mt-4 overflow-auto rounded-md border border-edge bg-bg-elevated p-3 font-mono text-xs text-ink-dim">
              {this.state.error.name}: {this.state.error.message}
              {this.state.error.stack
                ? "\n\n" + this.state.error.stack
                : ""}
            </pre>
            <button
              className="btn btn-primary mt-4"
              onClick={() => {
                this.setState({ error: null });
                location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
