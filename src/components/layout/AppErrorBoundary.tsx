"use client";

import { ReactNode } from "react";
import ErrorBoundary from "../ErrorBoundary";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      errorTitle="Application Error"
      showReload={true}
    >
      {children}
    </ErrorBoundary>
  );
}