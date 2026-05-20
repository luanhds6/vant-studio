import { Component, type ErrorInfo, type ReactNode } from "react";
import { VANT_CONSOLE_PREFIX } from "@/lib/globalConsoleErrorReporting";
import { sanitizeForLog } from "@/lib/security/sanitize";

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Captura erros de renderização React que de outro modo podem não aparecer na consola de forma clara.
 */
export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.groupCollapsed(`${VANT_CONSOLE_PREFIX} React ErrorBoundary`);
    console.error(sanitizeForLog(error));
    if (error.stack) console.error("stack:\n", sanitizeForLog(error.stack));
    console.error("componentStack:\n", errorInfo.componentStack);
    console.groupEnd();
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    if (hasError && error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-xl font-semibold">Algo correu mal</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Os detalhes do erro foram escritos na consola do browser (F12 → Consola). Procure por{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{VANT_CONSOLE_PREFIX}</code>.
          </p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
