"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "./Navigation";
import AppErrorBoundary from "./AppErrorBoundary";
import ApiErrorBoundary from "../ApiErrorBoundary";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function AuthenticatedLayout({ 
  children, 
  requireAuth = true 
}: AuthenticatedLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, requireAuth]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (requireAuth && !session) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-background">
        {session && <Navigation session={session} />}
        <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <ApiErrorBoundary>
            {children}
          </ApiErrorBoundary>
        </main>
      </div>
    </AppErrorBoundary>
  );
}