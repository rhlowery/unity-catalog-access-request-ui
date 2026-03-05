import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Zap, Clock, Terminal } from 'lucide-react';

interface TestErrorComponentProps {
  shouldThrow: boolean;
  errorMessage?: string;
}

const TestErrorComponentTyped = ({ shouldThrow, errorMessage = 'Test error triggered' }: TestErrorComponentProps) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div className="text-sm text-muted-foreground italic">No error thrown</div>;
};

export const ErrorTestPanel = () => {
  const [errorType, setErrorType] = useState('none');

  const triggerError = () => setErrorType('immediate');
  const triggerAsyncError = () => {
    setTimeout(() => {
      setErrorType('async');
    }, 100);
  };
  const triggerTypeError = () => setErrorType('type');
  const reset = () => setErrorType('none');

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary"><AlertCircle size={18} /></div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">Error Boundary Testing Panel</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trigger different types of errors to verify the robustness of application error boundaries.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="h-8 gap-2 border-red-500/30 hover:bg-red-500/10 text-red-500" onClick={triggerError}>
          <Zap size={14} />
          Immediate Error
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-orange-500/30 hover:bg-orange-500/10 text-orange-500" onClick={triggerAsyncError}>
          <Clock size={14} />
          Async Error
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-500" onClick={triggerTypeError}>
          <Terminal size={14} />
          Type Error
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={reset}>
          <RefreshCw size={14} />
          Reset
        </Button>
      </div>

      <div className="rounded-md bg-background/50 border border-border/40 p-3 min-h-[60px] flex items-center justify-center">
        {errorType === 'immediate' && (
          <TestErrorComponentTyped shouldThrow={true} errorMessage="Immediate test error triggered from panel" />
        )}

        {errorType === 'async' && (
          <TestErrorComponentTyped shouldThrow={true} errorMessage="Async test error triggered from panel" />
        )}

        {errorType === 'type' && (
          <TestErrorComponentTyped shouldThrow={true} errorMessage="TypeError test - accessing undefined property" />
        )}

        {errorType === 'none' && (
          <p className="text-xs text-muted-foreground italic">
            No active error. Use the buttons above to inject a failure.
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorTestPanel;