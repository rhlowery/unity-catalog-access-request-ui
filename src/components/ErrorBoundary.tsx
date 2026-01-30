import React, { Component, ReactNode } from 'react';
import { ObservabilityService } from '../services/ObservabilityService';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './ErrorBoundary.css';

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
        <div className="error-boundary">
          <div className="error-boundary__container glass-panel">
            <div className="error-boundary__icon">
              <AlertTriangle size={48} color="var(--danger)" />
            </div>

            <h1 className="error-boundary__title">
              Something went wrong
            </h1>

            <p className="error-boundary__message">
              We're sorry, but something unexpected happened.
              {this.state.errorId && (
                <span className="error-boundary__error-id">
                  {' '}Error ID: <code>{this.state.errorId}</code>
                </span>
              )}
            </p>

            <div className="error-boundary__actions">
              <button
                className="btn btn-primary"
                onClick={this.handleReset}
              >
                <RefreshCw size={16} />
                Try Again
              </button>

              <button
                className="btn btn-secondary"
                onClick={this.handleGoHome}
              >
                <Home size={16} />
                Go to Home
              </button>
            </div>

            {isDevelopment && (
              <details className="error-boundary__details">
                <summary>Error Details (Development Only)</summary>

                <div className="error-boundary__detail-section">
                  <h4>Error:</h4>
                  <pre className="error-boundary__stack">
                    {this.state.error?.toString()}
                  </pre>
                </div>

                <div className="error-boundary__detail-section">
                  <h4>Component Stack:</h4>
                  <pre className="error-boundary__stack">
                    {this.state.errorInfo?.componentStack}
                  </pre>
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
