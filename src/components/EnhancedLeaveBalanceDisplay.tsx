"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
}

interface LeaveTypeCardProps {
  type: string;
  icon: string;
  color: string;
  used: number;
  total: number;
  remaining: number;
  unit: string;
  description: string;
}

function LeaveTypeCard({ type, icon, color, used, total, remaining, unit, description }: LeaveTypeCardProps) {
  const percentage = total > 0 ? Math.max(5, (remaining / total) * 100) : 0;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 ${color} rounded-full flex-shrink-0`}></div>
          <div>
            <h4 className="text-sm font-medium text-card-foreground">{type}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-3xl font-bold text-card-foreground mb-1">
          {type === "TOIL" && remaining === 0 ? "0" : remaining}
        </div>
        <div className="text-xs text-muted-foreground">
          {unit} {type === "Unpaid" ? "available" : "remaining"}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full ${color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{used} used</span>
          <span>{type === "Unpaid" ? "∞" : total} total</span>
        </div>
      </div>
    </div>
  );
}

export default function EnhancedLeaveBalanceDisplay() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/leave/balance");
        if (!response.ok) {
          throw new Error("Failed to fetch balance");
        }
        const data = await response.json();
        setBalance(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load balance");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchBalance();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-8 bg-muted rounded w-1/2 mx-auto"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="text-destructive text-center">
          <p>Error loading balance: {error}</p>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="text-muted-foreground text-center">
          <p>No balance information available</p>
        </div>
      </div>
    );
  }

  // Extract data with proper fallbacks
  const annualBalance = balance.balances?.annual || {
    total: balance.totalAllowance || 25,
    used: balance.daysUsed || 0,
    remaining: balance.remaining || 25
  };
  
  const toilBalance = balance.balances?.toil || { total: 0, used: 0, remaining: 0 };
  const sickBalance = balance.balances?.sick || { total: 10, used: 0, remaining: 10 };

  const totalDaysAvailable = annualBalance.remaining + sickBalance.remaining + (toilBalance.remaining / 8); // Convert TOIL hours to days

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-2">Leave Balance Overview</h3>
        <p className="text-sm text-muted-foreground">Your current leave entitlements and usage across all types</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <LeaveTypeCard
          type="Annual Leave"
          icon="🏖️"
          color="bg-blue-500"
          used={annualBalance.used}
          total={annualBalance.total}
          remaining={annualBalance.remaining}
          unit="days"
          description="Yearly vacation entitlement"
        />

        <LeaveTypeCard
          type="Sick Leave"
          icon="🏥"
          color="bg-success"
          used={sickBalance.used}
          total={sickBalance.total}
          remaining={sickBalance.remaining}
          unit="days"
          description="Health & medical leave"
        />

        <LeaveTypeCard
          type="TOIL"
          icon="⏰"
          color="bg-purple-500"
          used={toilBalance.used}
          total={toilBalance.total || 40}
          remaining={toilBalance.remaining}
          unit="hours"
          description="Time Off In Lieu"
        />

      </div>

      {/* Summary Stats */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-card-foreground">{Math.round(totalDaysAvailable)}</div>
            <div className="text-xs text-muted-foreground">Total Days Available</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-card-foreground">{annualBalance.used + sickBalance.used}</div>
            <div className="text-xs text-muted-foreground">Days Used This Year</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-card-foreground">{toilBalance.remaining}h</div>
            <div className="text-xs text-muted-foreground">TOIL Accrued</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-success">
              {Math.round(((annualBalance.remaining + sickBalance.remaining) / (annualBalance.total + sickBalance.total)) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Leave Available</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Click "Request Leave" above to submit a new leave request
        </p>
      </div>
    </div>
  );
}