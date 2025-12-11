import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Une erreur est survenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Désolé, quelque chose s'est mal passé. Vous pouvez réessayer ou actualiser la page.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleRetry}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
                <Button onClick={this.handleReload}>
                  Actualiser la page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to manually trigger error boundary
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    handleError: (err: Error) => setError(err),
    resetError: () => setError(null),
  };
};

// Simple error display component for inline errors
interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message = 'Une erreur est survenue',
  onRetry,
  className = '',
}) => (
  <div className={`bg-destructive/10 border border-destructive/20 rounded-xl p-4 ${className}`}>
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-destructive">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="w-4 h-4 mr-1" />
          Réessayer
        </Button>
      )}
    </div>
  </div>
);

// Loading state component
interface LoadingDisplayProps {
  message?: string;
  className?: string;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  message = 'Chargement...',
  className = '',
}) => (
  <div className={`flex items-center justify-center py-12 ${className}`}>
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Empty state component
interface EmptyDisplayProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyDisplay: React.FC<EmptyDisplayProps> = ({
  icon,
  title = 'Aucune donnée',
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
    {icon && <div className="text-muted-foreground/50 mb-4">{icon}</div>}
    <p className="text-muted-foreground font-medium">{title}</p>
    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
