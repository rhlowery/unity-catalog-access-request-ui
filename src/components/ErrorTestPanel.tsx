
import React, { useState } from 'react';

// Test component that throws an error for testing ErrorBoundary
const TestErrorComponent = ({ shouldThrow, errorMessage = 'Test error triggered' }: any) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error thrown</div>;
};

interface TestErrorComponentProps {
  shouldThrow: boolean;
  errorMessage?: string;
}

const TestErrorComponentTyped = ({ shouldThrow, errorMessage = 'Test error triggered' }: TestErrorComponentProps) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error thrown</div>;
};

// Component with various error scenarios for testing
export const ErrorTestPanel = () => {
  const [errorType, setErrorType] = useState('none');

  const triggerError = () => {
    setErrorType('immediate');
  };

  const triggerAsyncError = () => {
    setTimeout(() => {
      setErrorType('async');
    }, 100);
  };

  const triggerTypeError = () => {
    setErrorType('type');
  };

  const reset = () => {
    setErrorType('none');
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', margin: '1rem 0' }}>
      <h3>Error Boundary Testing Panel</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        This panel helps test error boundaries by triggering different types of errors.
        Only visible in development mode.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={triggerError}>
          Trigger Immediate Error
        </button>
        <button className="btn btn-primary" onClick={triggerAsyncError}>
          Trigger Async Error
        </button>
        <button className="btn btn-primary" onClick={triggerTypeError}>
          Trigger Type Error
        </button>
        <button className="btn btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>

      {errorType === 'immediate' && (
        <TestErrorComponentTyped shouldThrow={true} errorMessage="Immediate test error" />
      )}

      {errorType === 'async' && (
        <TestErrorComponentTyped shouldThrow={true} errorMessage="Async test error" />
      )}

      {errorType === 'type' && (
        <TestErrorComponentTyped shouldThrow={true} errorMessage="TypeError test - accessing undefined property" />
      )}

      {errorType === 'none' && (
        <div style={{
          padding: '1rem',
          background: 'var(--glass-bg)',
          borderRadius: '8px',
          color: 'var(--text-secondary)'
        }}>
          No errors triggered. Click buttons above to test error boundaries.
        </div>
      )}
    </div>
  );
};

export default ErrorTestPanel;