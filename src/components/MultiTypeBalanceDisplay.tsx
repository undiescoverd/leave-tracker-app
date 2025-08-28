"use client";

import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import type { BalanceType } from '@/types/leave';

export default function MultiTypeBalanceDisplay() {
  const { balance: balanceData, loading, error } = useLeaveBalance();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
        {error}
      </div>
    );
  }

  if (!balanceData) return null;

  const isMultiType = balanceData.features?.multiTypeEnabled;

  // Single type display (backward compatible)
  if (!isMultiType) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Annual Leave Balance</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Allowance:</span>
            <span className="font-semibold">{balanceData.totalAllowance} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Days Used:</span>
            <span className="font-semibold">{balanceData.daysUsed} days</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-bold text-blue-600">{balanceData.remaining} days</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(balanceData.daysUsed / balanceData.totalAllowance) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Multi-type display
  const balances = balanceData.balancesByType || {};
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Leave Balances</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Annual Leave Card */}
        {balances.annual && (
          <BalanceCard
            type="annual"
            balance={balances.annual}
            color="blue"
            icon="📅"
          />
        )}

        {/* TOIL Card */}
        {balances.toil && (
          <BalanceCard
            type="toil"
            balance={balances.toil}
            color="green"
            icon="⏰"
          />
        )}

        {/* Sick Leave Card */}
        {balances.sick && (
          <BalanceCard
            type="sick"
            balance={balances.sick}
            color="orange"
            icon="🏥"
          />
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{balanceData.remaining}</p>
            <p className="text-xs text-gray-600">Annual Days Left</p>
          </div>
          {balances.toil && (
            <div>
              <p className="text-2xl font-bold text-green-600">{balances.toil.remaining}</p>
              <p className="text-xs text-gray-600">TOIL Hours</p>
            </div>
          )}
          {balances.sick && (
            <div>
              <p className="text-2xl font-bold text-orange-600">{balances.sick.remaining}</p>
              <p className="text-xs text-gray-600">Sick Days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Balance Card Component
function BalanceCard({ 
  type, 
  balance, 
  color, 
  icon 
}: { 
  type: string;
  balance: BalanceType;
  color: string;
  icon: string;
}) {
  const percentage = balance.total > 0 
    ? (balance.used / balance.total) * 100 
    : 0;

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  }[color] || 'bg-gray-50 border-gray-200 text-gray-600';

  const progressColor = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  }[color] || 'bg-gray-500';

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold mt-1">{balance.label}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{balance.remaining}</p>
          <p className="text-xs opacity-75">{balance.unit} left</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs opacity-75">
          <span>Used: {balance.used} {balance.unit}</span>
          <span>Total: {balance.total} {balance.unit}</span>
        </div>
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
          <div 
            className={`${progressColor} h-2 rounded-full transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs opacity-75">
          {percentage.toFixed(0)}% used
        </div>
      </div>
    </div>
  );
}
