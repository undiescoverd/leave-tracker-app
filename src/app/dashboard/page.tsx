"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import EnhancedLeaveRequestForm from "@/components/EnhancedLeaveRequestForm";
import MultiTypeBalanceDisplay from "@/components/MultiTypeBalanceDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow border-b">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground font-bold">
                TDH Agency Leave Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <ThemeToggle />
              <Button
                onClick={async () => {
                  try {
                    await signOut({ 
                      callbackUrl: "/login",
                      redirect: true 
                    });
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Fallback redirect
                    window.location.href = '/login';
                  }
                }}
                variant="destructive"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Dashboard
            </h2>
            <MultiTypeBalanceDisplay />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Submit New Request</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedLeaveRequestForm />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Button 
                    onClick={() => router.push("/leave/requests")}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    My Leave History
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    View Team Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Section */}
          {session.user?.role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button 
                    onClick={() => router.push("/admin/pending-requests")}
                    variant="outline"
                    className="w-full"
                  >
                    Pending Requests
                  </Button>
                  <Button 
                    onClick={() => router.push("/admin/toil")}
                    variant="outline"
                    className="w-full"
                  >
                    Manage TOIL
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                  >
                    User Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
