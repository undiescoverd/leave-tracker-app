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

export default function MultiTypeBalanceDisplay() {
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
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
            <div className="h-3 bg-muted rounded w-4/6"></div>
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

  const calculatePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-destructive";
    if (percentage >= 60) return "bg-warning";
    return "bg-success";
  };

  // Extract data with proper fallbacks
  const annualBalance = balance.balances?.annual || {
    total: balance.totalAllowance || 0,
    used: balance.daysUsed || 0,
    remaining: balance.remaining || 0
  };
  
  const toilBalance = balance.balances?.toil || { total: 0, used: 0, remaining: 0 };
  const sickBalance = balance.balances?.sick || { total: 0, used: 0, remaining: 0 };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-2">Leave Balance</h3>
        <p className="text-sm text-muted-foreground">Your current leave entitlements and usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Annual Leave */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">Annual Leave</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
              {annualBalance.used}/{annualBalance.total} days
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(calculatePercentage(annualBalance.used, annualBalance.total))}`}
              style={{ width: `${calculatePercentage(annualBalance.used, annualBalance.total)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">
            {annualBalance.remaining} days remaining
          </p>
        </div>

        {/* TOIL - Only show if available */}
        {(balance.balances?.toil || toilBalance.total > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">TOIL</span>
              <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                {toilBalance.remaining} hours
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-success"
                style={{ width: `${Math.min(100, (toilBalance.remaining / 40) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">
              {toilBalance.remaining} hours available
            </p>
          </div>
        )}

        {/* Sick Leave - Only show if available */}
        {(balance.balances?.sick || sickBalance.total > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">Sick Leave</span>
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full">
                {sickBalance.used}/{sickBalance.total} days
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(calculatePercentage(sickBalance.used, sickBalance.total))}`}
                style={{ width: `${calculatePercentage(sickBalance.used, sickBalance.total)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sickBalance.remaining} days remaining
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Annual Leave:</span>
            <span className="ml-2 font-medium">{annualBalance.total} days</span>
          </div>
          {(balance.balances?.toil || toilBalance.total > 0) && (
            <div>
              <span className="text-muted-foreground">Total TOIL:</span>
              <span className="ml-2 font-medium">{toilBalance.remaining} hours</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
