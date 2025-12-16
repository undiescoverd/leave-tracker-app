"use client";

import { Session } from "next-auth";
import { isAdminRole, shouldHideLeaveBalance } from "@/types/next-auth";
import { LazyTeamCalendar } from "@/components/lazy/CalendarComponents";
import { LazyAdminActions } from "@/components/lazy/AdminComponents";
import LeaveActions from "./LeaveActions";
import LeaveBalanceWidget from "./LeaveBalanceWidget";

interface DashboardContentProps {
  session: Session;
}

export default function DashboardContent({ session }: DashboardContentProps) {
  // Check if user has any admin role (ADMIN, TECH_ADMIN, or OWNER)
  const isAdmin: boolean = isAdminRole(session.user?.role);

  // Check if leave balance should be hidden (TECH_ADMIN and OWNER don't take leave)
  const hideBalance: boolean = shouldHideLeaveBalance(session.user?.role);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Dashboard
        </h2>

        {/* Conditionally render LeaveBalanceWidget - hide for TECH_ADMIN and OWNER */}
        {!hideBalance && <LeaveBalanceWidget />}
      </div>

      {/* Admin Section - shown for all admin types */}
      {isAdmin && <LazyAdminActions />}

      {/* Leave Actions - only show for users who can take leave */}
      {!hideBalance && <LeaveActions />}

      {/* Team Calendar Section - shown for all users */}
      <div id="team-calendar">
        <LazyTeamCalendar />
      </div>
    </div>
  );
}