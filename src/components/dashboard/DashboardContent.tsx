"use client";

import { Session } from "next-auth";
import { UserRole } from "@/types/next-auth";
import EnhancedLeaveBalanceDisplay from "@/components/EnhancedLeaveBalanceDisplay";
import { LazyTeamCalendar } from "@/components/lazy/CalendarComponents";
import { LazyAdminActions } from "@/components/lazy/AdminComponents";
import LeaveActions from "./LeaveActions";

interface DashboardContentProps {
  session: Session;
}

export default function DashboardContent({ session }: DashboardContentProps) {
  const isAdmin: boolean = session.user?.role === "ADMIN";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Dashboard
        </h2>
        <EnhancedLeaveBalanceDisplay />
      </div>

      {/* Admin Section */}
      {isAdmin && <LazyAdminActions />}

      {/* Leave Actions */}
      <LeaveActions />

      {/* Team Calendar Section */}
      <div id="team-calendar">
        <LazyTeamCalendar />
      </div>
    </div>
  );
}