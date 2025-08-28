"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface LeaveBalance {
  annual: number;
  toil: number;
  sick: number;
  used: {
    annual: number;
    toil: number;
    sick: number;
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="text-red-600 text-center">
          <p>Error loading balance: {error}</p>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="text-gray-600 text-center">
          <p>No balance information available</p>
        </div>
      </div>
    );
  }

  const calculatePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-teal-500";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Balance</h3>
        <p className="text-sm text-gray-600">Your current leave entitlements and usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Annual Leave */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Annual Leave</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {balance.used.annual}/{balance.annual} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(calculatePercentage(balance.used.annual, balance.annual))}`}
              style={{ width: `${calculatePercentage(balance.used.annual, balance.annual)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {balance.annual - balance.used.annual} days remaining
          </p>
        </div>

        {/* TOIL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">TOIL</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {balance.toil} hours
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${Math.min(100, (balance.toil / 40) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {balance.toil} hours available
          </p>
        </div>

        {/* Sick Leave */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Sick Leave</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              {balance.used.sick}/{balance.sick} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(calculatePercentage(balance.used.sick, balance.sick))}`}
              style={{ width: `${calculatePercentage(balance.used.sick, balance.sick)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {balance.sick - balance.used.sick} days remaining
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Annual Leave:</span>
            <span className="ml-2 font-medium">{balance.annual} days</span>
          </div>
          <div>
            <span className="text-gray-600">Total TOIL:</span>
            <span className="ml-2 font-medium">{balance.toil} hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
