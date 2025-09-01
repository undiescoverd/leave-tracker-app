"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  fallbackRoute?: string;
  className?: string;
}

export function BackButton({ 
  fallbackRoute = "/dashboard", 
  className = "" 
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's browser history to go back to
    // This is a simple check - we assume if we're not on the first page load
    // there should be history available
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleBack = () => {
    if (canGoBack && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.push(fallbackRoute);
    }
  };

  // Don't show the back button if we can't go back and no fallback
  if (!canGoBack && !fallbackRoute) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-1 text-muted-foreground hover:text-foreground ${className}`}
      title="Go back"
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
}