"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/ui/back-button";

interface NavigationProps {
  session: Session;
}

function getTimeOfDayGreeting(firstName: string): string {
  if (!firstName) return "";

  const hour = new Date().getHours(); // local time
  let timeOfDay: "morning" | "afternoon" | "evening";

  if (hour >= 5 && hour < 12) {
    timeOfDay = "morning";
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = "afternoon";
  } else {
    timeOfDay = "evening";
  }

  const nameLower = firstName.toLowerCase();

  // Luis gets Portuguese greetings
  if (nameLower === "luis") {
    if (timeOfDay === "morning") return `Bom dia, ${firstName}`;
    if (timeOfDay === "afternoon") return `Boa tarde, ${firstName}`;
    return `Boa noite, ${firstName}`; // used for evening
  }

  // Ian and Senay (and everyone else) in English
  if (timeOfDay === "morning") return `Good morning, ${firstName}`;
  if (timeOfDay === "afternoon") return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export default function Navigation({ session }: NavigationProps) {
  const fullNameOrEmail = session.user?.name || session.user?.email || "";
  const firstName = fullNameOrEmail.includes(" ")
    ? fullNameOrEmail.split(" ")[0]
    : fullNameOrEmail.split("@")[0] || fullNameOrEmail;

  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting(firstName));
  }, [firstName]);

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: "/login",
        redirect: true 
      });
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-xl font-semibold text-foreground">
              TDH Agency Leave Tracker
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {greeting || `Welcome, ${firstName}`}
            </span>
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}