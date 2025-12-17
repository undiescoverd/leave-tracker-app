"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, Clock, TrendingUp, AlertCircle, FileCheck, Settings, RefreshCw } from "lucide-react";
import TeamCalendar from "@/components/calendar/TeamCalendar";

// ✅ Import React Query hooks with realtime subscriptions
import { useAdminStats } from "@/hooks/useAdminData";
import { useQuery } from "@tanstack/react-query";

interface BusinessStats {
  pendingRequests: number;
  totalUsers: number;
  activeEmployees: number;
  toilPending: number;
  teamOnLeave: number;
  coverageLevel: number;
  upcomingLeave: Array<{
    name: string;
    startDate: string;
    endDate: string;
    type: string;
  }>;
}

export default function BusinessAdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  // ✅ Use React Query hooks with realtime subscriptions
  const { data: adminStats, isLoading: statsLoading } = useAdminStats();
  const { data: upcomingLeaveData, isLoading: leaveLoading, refetch: refetchLeave } = useQuery({
    queryKey: ['admin', 'upcoming-leave'],
    queryFn: async () => {
      const response = await fetch('/api/admin/upcoming-leave');
      if (!response.ok) throw new Error('Failed to fetch upcoming leave');
      const result = await response.json();
      return result.upcomingLeave || [];
    },
  });

  const loading = statsLoading || leaveLoading;

  // Compute business stats from adminStats + upcomingLeave
  const stats: BusinessStats | null = adminStats && upcomingLeaveData ? {
    ...adminStats,
    teamOnLeave: upcomingLeaveData.filter((leave: any) => new Date(leave.startDate) <= new Date()).length,
    coverageLevel: Math.max(60, 100 - (upcomingLeaveData.length * 15)),
    upcomingLeave: upcomingLeaveData
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading team overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">
                  TDH Agency - Team Management
                </h1>
                {stats && stats.pendingRequests > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {stats.pendingRequests} Pending
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">
                  Welcome, {session?.user?.name || session?.user?.email}
                </span>
                <span className="text-xs text-green-600 font-medium">
                  ● Live Updates
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLeave()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Team Overview
            </h2>
            <p className="text-muted-foreground">
              Monitor team availability, approve leave requests, and ensure business continuity
            </p>
          </div>

          {/* Team Status - Wide Cards for People Focus */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Coverage Status
                </CardTitle>
                <CardDescription>
                  Current team availability and coverage level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Team Coverage</span>
                    <span className="text-2xl font-bold">{stats?.coverageLevel || 85}%</span>
                  </div>
                  <Progress value={stats?.coverageLevel || 85} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{stats?.totalUsers || 0} total team members</span>
                    <span>{stats?.teamOnLeave || 0} currently on leave</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Urgent Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Approvals</span>
                    <Badge variant="destructive">{stats?.pendingRequests || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">TOIL Hours</span>
                    <Badge variant="secondary">{stats?.toilPending || 0}h</Badge>
                  </div>
                  <Button
                    className="w-full mt-4 relative"
                    onClick={() => router.push("/admin/pending-requests")}
                  >
                    Review Requests
                    {stats && stats.pendingRequests > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-white text-primary hover:bg-white"
                      >
                        {stats.pendingRequests}
                      </Badge>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Business Focus */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  View team members and their leave balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  onClick={() => router.push("/admin/employee-balances")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Team
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coverage Planning</CardTitle>
                <CardDescription>
                  Monitor team coverage and plan for absences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  disabled
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  View Coverage
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Reports</CardTitle>
                <CardDescription>
                  Generate reports on leave utilization and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  disabled
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employee Balances</CardTitle>
                <CardDescription>
                  View leave balances for all team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  onClick={() => router.push("/admin/employee-balances")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Balances
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave Policies</CardTitle>
                <CardDescription>
                  Review and update company leave policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  variant="secondary"
                  disabled
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seed Test Data</CardTitle>
                <CardDescription>
                  Add sample data for testing and development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/admin/seed-data")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Data
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Team Calendar */}
          <div>
            <TeamCalendar />
          </div>

          {/* Upcoming Leave - People-First Display */}
          {stats?.upcomingLeave && stats.upcomingLeave.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Team Absences</CardTitle>
                <CardDescription>
                  Plan ahead for team coverage needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.upcomingLeave.map((leave, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>{leave.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{leave.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {leave.startDate} to {leave.endDate} - {leave.type}
                        </p>
                      </div>
                      <Badge variant="outline">{leave.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}