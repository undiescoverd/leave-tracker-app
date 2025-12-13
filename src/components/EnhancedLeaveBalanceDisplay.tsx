"use client";

import { useMemo, memo } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Heart, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { shouldShowNotificationBadge } from "@/lib/notifications/notification-policy";

interface LeaveBalance {
  // Legacy format support
  totalAllowance?: number;
  daysUsed?: number;
  remaining?: number;
  
  // New multi-type format
  balances?: {
    annual?: {
      total: number;
      used: number;
      remaining: number;
    };
    toil?: {
      total: number;
      used: number;
      remaining: number;
    };
    sick?: {
      total: number;
      used: number;
      remaining: number;
    };
  };
  
  // Pending requests data
  pending?: {
    annual?: number;
    toil?: number;
    sick?: number;
    total?: number;
    count?: number; // Count of pending requests (not just days)
  };
}

const leaveTypeConfigs = {
  annual: {
    icon: Calendar,
    title: "Annual Leave Balance",
    iconColor: "text-blue-500"
  },
  sick: {
    icon: Heart,
    title: "Sick Leave Balance", 
    iconColor: "text-emerald-500"
  },
  toil: {
    icon: Clock,
    title: "TOIL Balance",
    iconColor: "text-violet-500"
  }
};

interface LeaveTypeCardProps {
  type: 'annual' | 'sick' | 'toil';
  used: number;
  total: number;
  remaining: number;
  unit: string;
  pending?: number;
}

const LeaveTypeCard = memo(function LeaveTypeCard({ type, used, total, remaining, unit, pending = 0 }: LeaveTypeCardProps) {
  const config = leaveTypeConfigs[type];
  const Icon = config.icon;
  
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:bg-card/80 transition-colors">
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          {config.title}
        </h3>
        <div className="flex items-center gap-2">
          {shouldShowNotificationBadge(pending) && (
            <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">
              {pending} pending
            </span>
          )}
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
      </div>
      
      {/* Main value */}
      <div className="mt-2">
        <p className="text-3xl font-bold text-foreground">
          {remaining}
          {shouldShowNotificationBadge(pending) && (
            <span className="text-lg font-normal text-muted-foreground ml-2">
              (-{pending})
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {unit} remaining
        </p>
      </div>
    </div>
  );
});

export default function EnhancedLeaveBalanceDisplay() {
  const { data: session } = useSession();
  const { data: balance, isLoading: loading, error: fetchError } = useLeaveBalance(
    session?.user?.id || '',
    { enabled: !!session?.user?.id }
  );
  
  const error = fetchError?.message || null;

  // Extract data with proper fallbacks - memoized for performance (moved before conditional returns)
  const { annualBalance, toilBalance, sickBalance, totalDaysAvailable } = useMemo(() => {
    if (!balance) {
      // Return default values when balance is not available
      return {
        annualBalance: { total: 32, used: 0, remaining: 32 },
        toilBalance: { total: 0, used: 0, remaining: 0 },
        sickBalance: { total: 3, used: 0, remaining: 3 },
        totalDaysAvailable: 35
      };
    }
    
    const annual = balance.balances?.annual || {
      total: balance.totalAllowance || 32,
      used: balance.daysUsed || 0,
      remaining: balance.remaining || 32
    };
    
    const toil = balance.balances?.toil || { total: 0, used: 0, remaining: 0 };
    const sick = balance.balances?.sick || { total: 3, used: 0, remaining: 3 };

    const totalDays = annual.remaining + sick.remaining + (toil.remaining / 8); // Convert TOIL hours to days

    return {
      annualBalance: annual,
      toilBalance: toil,
      sickBalance: sick,
      totalDaysAvailable: totalDays
    };
  }, [balance]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <div className="animate-pulse">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-5 w-5 bg-muted rounded" />
                </div>
                {/* Value skeleton */}
                <div className="mt-2">
                  <div className="h-10 w-16 bg-muted rounded mb-2" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-destructive">Failed to load leave balance data</p>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">No balance information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <LeaveTypeCard
          type="annual"
          used={annualBalance.used}
          total={annualBalance.total}
          remaining={annualBalance.remaining}
          unit="days"
          pending={balance.pending?.annual || 0}
        />

        <LeaveTypeCard
          type="sick"
          used={sickBalance.used}
          total={sickBalance.total}
          remaining={sickBalance.remaining}
          unit="days"
          pending={balance.pending?.sick || 0}
        />

        <LeaveTypeCard
          type="toil"
          used={toilBalance.used}
          total={toilBalance.total || 40}
          remaining={toilBalance.remaining}
          unit="hours"
          pending={balance.pending?.toil || 0}
        />
      </div>
      
      {/* Pending Requests Summary - Only show if there are actionable notifications */}
      {balance.pending && (balance.pending.count || 0) > 0 && (
        <div className="bg-card border border-orange-500/30 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-medium text-foreground">
                Pending Requests {balance.pending.count ? `(${balance.pending.count})` : ''}
              </h3>
            </div>
            <button 
              className="text-xs text-orange-400 hover:text-orange-300"
              onClick={() => window.location.href = '/leave/requests'}
            >
              View all →
            </button>
          </div>
          
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            {balance.pending.annual && balance.pending.annual > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual:</span>
                <span className="text-orange-400">{balance.pending.annual} days</span>
              </div>
            )}
            {balance.pending.sick && balance.pending.sick > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sick:</span>
                <span className="text-orange-400">{balance.pending.sick} days</span>
              </div>
            )}
            {balance.pending.toil && balance.pending.toil > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">TOIL:</span>
                <span className="text-orange-400">{balance.pending.toil} hours</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}