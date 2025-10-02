"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./providers/QueryProvider";
import { ServiceWorkerProvider } from "./ServiceWorkerProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <ServiceWorkerProvider>
            {children}
          </ServiceWorkerProvider>
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
