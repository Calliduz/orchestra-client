import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button.js';
import { Card } from './Card.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ORCHESTRA Unhandled Telemetry Exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-16 px-4">
          <Card
            title="Telemetry Exception Caught"
            subtitle="The view encountered an unexpected rendering error"
            className="border-rose-300 dark:border-rose-900/50 shadow-lg"
          >
            <div className="flex items-start gap-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-rose-900 dark:text-rose-200">
                  {this.state.error?.name || 'Runtime Error'}
                </div>
                <div className="font-mono text-rose-700 dark:text-rose-300 break-words">
                  {this.state.error?.message || 'An unhandled rendering fault interrupted the component hierarchy.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Console
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
