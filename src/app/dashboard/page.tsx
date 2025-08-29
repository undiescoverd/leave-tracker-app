"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import EnhancedLeaveRequestForm from "@/components/EnhancedLeaveRequestForm";
import MultiTypeBalanceDisplay from "@/components/MultiTypeBalanceDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                TDH Agency Leave Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <ThemeToggle />
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    await signOut({ 
                      callbackUrl: "/login",
                      redirect: true 
                    });
                  } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/login';
                  }
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Dashboard
            </h2>
            <MultiTypeBalanceDisplay />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Submit New Request</CardTitle>
                <CardDescription>
                  Create a new leave request for approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedLeaveRequestForm />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>
                  Access your leave history and team information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/leave/requests")}
                >
                  My Leave History
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled
                >
                  View Team Calendar
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Admin Section */}
          {session.user?.role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
                <CardDescription>
                  Manage leave requests and system administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Button 
                    variant="default"
                    onClick={() => router.push("/admin")}
                  >
                    Admin Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push("/admin/pending-requests")}
                  >
                    Pending Requests
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push("/admin/toil")}
                  >
                    Manage TOIL
                  </Button>
                  <Button 
                    variant="outline"
                    disabled
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
