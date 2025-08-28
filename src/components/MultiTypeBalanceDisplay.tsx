"use client";

import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import type { BalanceType } from '@/types/leave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function MultiTypeBalanceDisplay() {
  const { balance: balanceData, loading, error } = useLeaveBalance();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading balances...</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!balanceData) return null;

  const isMultiType = (balanceData as any).features?.multiTypeEnabled;

  // Single type display (backward compatible)
  if (!isMultiType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Allowance:</span>
                <span className="font-semibold">{balanceData.totalAllowance} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Used:</span>
                <span className="font-semibold">{balanceData.daysUsed} days</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-bold text-primary">{balanceData.remaining} days</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={(balanceData.daysUsed / balanceData.totalAllowance) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round((balanceData.daysUsed / balanceData.totalAllowance) * 100)}% used
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-type display
  const balances = (balanceData as any).balancesByType || {};
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Leave Balances</h2>
      
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{balanceData.remaining}</p>
              <p className="text-xs text-muted-foreground">Annual Days Left</p>
            </div>
            {balances.toil && (
              <div>
                <p className="text-2xl font-bold text-green-600">{balances.toil.remaining}</p>
                <p className="text-xs text-muted-foreground">TOIL Hours</p>
              </div>
            )}
            {balances.sick && (
              <div>
                <p className="text-2xl font-bold text-orange-600">{balances.sick.remaining}</p>
                <p className="text-xs text-muted-foreground">Sick Days</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'border-blue-200 bg-blue-50/50';
      case 'green': return 'border-green-200 bg-green-50/50';
      case 'orange': return 'border-orange-200 bg-orange-50/50';
      default: return 'border-border bg-muted/50';
    }
  };

  const getTextColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600';
      case 'green': return 'text-green-600';
      case 'orange': return 'text-orange-600';
      default: return 'text-foreground';
    }
  };

  return (
    <Card className={`border-2 ${getColorClasses(color)}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-2xl mb-1 block">{icon}</span>
            <h3 className={`font-semibold ${getTextColor(color)}`}>{balance.label}</h3>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getTextColor(color)}`}>{balance.remaining}</p>
            <p className="text-xs text-muted-foreground">{balance.unit} left</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Used: {balance.used} {balance.unit}</span>
            <span>Total: {balance.total} {balance.unit}</span>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <div className="text-right text-xs text-muted-foreground">
            {percentage.toFixed(0)}% used
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
