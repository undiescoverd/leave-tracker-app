"use client";

import { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ApiErrorBoundaryProps {
  children: ReactNode;
}

function ApiErrorFallback() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <CardTitle>Service Unavailable</CardTitle>
        </div>
        <CardDescription>
          We're having trouble connecting to our services. This may be temporary.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Please check your internet connection and try again.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApiErrorBoundary({ children }: ApiErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<ApiErrorFallback />}
      errorTitle="API Connection Error"
      showReload={true}
    >
      {children}
    </ErrorBoundary>
  );
}