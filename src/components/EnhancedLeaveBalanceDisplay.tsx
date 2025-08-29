"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Heart, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

const leaveTypeConfigs = {
  annual: {
    icon: Calendar,
    title: "Annual Leave",
    color: "blue",
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
    progressColor: "bg-blue-500"
  },
  sick: {
    icon: Heart,
    title: "Sick Leave", 
    color: "emerald",
    bgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    progressColor: "bg-emerald-500"
  },
  toil: {
    icon: Clock,
    title: "TOIL",
    color: "violet", 
    bgColor: "bg-violet-500/10",
    iconColor: "text-violet-500",
    progressColor: "bg-violet-500"
  }
};

interface LeaveTypeCardProps {
  type: 'annual' | 'sick' | 'toil';
  used: number;
  total: number;
  remaining: number;
  unit: string;
}

function LeaveTypeCard({ type, used, total, remaining, unit }: LeaveTypeCardProps) {
  const config = leaveTypeConfigs[type];
  const Icon = config.icon;
  const percentage = total > 0 ? (used / total) * 100 : 0;
  
  return (
    <Card className="bg-card border-border hover:bg-card/80 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-bold text-foreground">
            {remaining}
          </p>
          <p className="text-sm text-muted-foreground">
            {unit} remaining
          </p>
        </div>
        
        <div className="mt-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${config.progressColor} transition-all duration-300`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{used} used</span>
            <span>{total} total</span>
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-sm font-medium text-foreground">{config.title}</p>
        </div>
      </CardContent>
    </Card>
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
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-6 bg-muted rounded-lg mb-4" />
                <div className="h-10 w-20 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded mb-2" />
                <div className="h-2 w-full bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <Card className="p-6">
          <CardContent>
            <p className="text-destructive">Failed to load leave balance data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">No balance information available</p>
          </CardContent>
        </Card>
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
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <LeaveTypeCard
          type="annual"
          used={annualBalance.used}
          total={annualBalance.total}
          remaining={annualBalance.remaining}
          unit="days"
        />

        <LeaveTypeCard
          type="sick"
          used={sickBalance.used}
          total={sickBalance.total}
          remaining={sickBalance.remaining}
          unit="days"
        />

        <LeaveTypeCard
          type="toil"
          used={toilBalance.used}
          total={toilBalance.total || 40}
          remaining={toilBalance.remaining}
          unit="hours"
        />
      </div>
    </div>
  );
}