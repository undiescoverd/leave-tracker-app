"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface FormErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
}

export class FormErrorBoundary extends React.Component<
  FormErrorBoundaryProps,
  FormErrorBoundaryState
> {
  constructor(props: FormErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: FormErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, index) => prevProps.resetKeys?.[index] !== key)) {
        this.setState({ hasError: false, error: undefined });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p>An error occurred while processing the form. Please try again.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
              </details>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    onError?: (error: Error) => void;
    resetKeys?: Array<string | number>;
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <FormErrorBoundary {...options}>
      <Component {...props} />
    </FormErrorBoundary>
  );

  WrappedComponent.displayName = `withFormErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}