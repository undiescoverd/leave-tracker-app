/**
 * Custom hook for managing leave balance data
 */

import { useState, useEffect } from 'react';
import type { LeaveBalance } from '@/types/leave';

interface UseLeaveBalanceReturn {
  balance: LeaveBalance | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeaveBalance(): UseLeaveBalanceReturn {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/leave/balance');
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.data);
      } else {
        setError('Failed to load leave balance');
      }
    } catch (err) {
      setError('An error occurred while loading balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}