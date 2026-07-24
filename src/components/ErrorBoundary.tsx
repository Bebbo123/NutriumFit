import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-cyan-950/10 text-center relative overflow-hidden">
            {/* Background ambient light */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Error Icon */}
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-800/30 flex items-center justify-center text-cyan-400 mx-auto mb-6 shadow-lg shadow-cyan-950/20 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Oops! Qualcosa è andato storto
            </h1>
            
            {/* Description */}
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Si è verificato un errore imprevisto. I tuoi dati inseriti in locale sono al sicuro, ma l'interfaccia ha riscontrato un problema.
            </p>

            {/* Premium Reload Button */}
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-2xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mb-4"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Qualcosa è andato storto - Ricarica</span>
            </button>

            {/* Collapsible Details */}
            {this.state.error && (
              <div className="border-t border-slate-800/60 pt-4 mt-2">
                <button
                  onClick={this.toggleDetails}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer focus:outline-none"
                >
                  <span>Dettagli tecnici</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="text-left mt-3 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 overflow-x-auto max-h-48 text-[11px] font-mono text-cyan-400/90 leading-normal selection:bg-cyan-500/20">
                    <div className="font-bold text-red-400 mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre className="whitespace-pre text-slate-500 overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
