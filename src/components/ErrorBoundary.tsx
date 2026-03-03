import React, { Component, ReactNode } from 'react';
import { ObservabilityService } from '../services/ObservabilityService';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = ObservabilityService.logError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-8 border border-destructive/20 shadow-2xl shadow-destructive/10">
              <AlertTriangle size={42} className="text-destructive" />
            </div>

            <h1 className="text-3xl font-black tracking-tighter text-foreground mb-4">
              System Interrupted
            </h1>

            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md">
              We've encountered an unexpected runtime exception. Our observability systems have been notified.
              {this.state.errorId && (
                <div className="mt-4 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-mono tracking-widest uppercase opacity-70">
                  Ref ID: {this.state.errorId}
                </div>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                className="h-12 px-8 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                onClick={this.handleReset}
              >
                <RefreshCw size={18} />
                Refresh State
              </button>

              <button
                className="h-12 px-8 bg-white/5 hover:bg-white/10 text-foreground font-bold rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2"
                onClick={this.handleGoHome}
              >
                <Home size={18} />
                Return Home
              </button>
            </div>

            {isDevelopment && (
              <details className="mt-12 w-full text-left bg-black/40 rounded-2xl border border-white/5 overflow-hidden group">
                <summary className="px-6 py-4 cursor-pointer text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-white/5 transition-colors list-none flex items-center justify-between">
                  <span>Trace details (Dev Only)</span>
                  <span className="text-[10px] opacity-40 group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <div className="p-6 border-t border-white/5 space-y-6 max-h-[400px] overflow-auto custom-scrollbar">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive/80">Message</h4>
                    <pre className="text-xs font-mono p-4 bg-white/5 rounded-xl border border-white/5 text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                      {(() => {
                        let msg = this.state.error?.toString() || '';
                        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
                        sensitiveKeys.forEach(k => {
                          const reg = new RegExp(`${k}[:=]\\s*[^\\s&,|]+`, 'gi');
                          msg = msg.replace(reg, `${k}=\"********\"`);
                        });
                        return msg;
                      })()}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Component Stack</h4>
                    <pre className="text-[10px] font-mono p-4 bg-white/5 rounded-xl border border-white/5 text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
