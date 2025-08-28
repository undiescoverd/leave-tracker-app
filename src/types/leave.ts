/**
 * Shared TypeScript interfaces for leave-related functionality
 */

export type LeaveType = 'ANNUAL' | 'TOIL' | 'SICK';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveBalanceDetails {
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveBalance {
  totalAllowance: number;
  daysUsed: number;
  remaining: number;
  balances?: {
    annual: LeaveBalanceDetails;
    toil?: LeaveBalanceDetails;
    sick?: LeaveBalanceDetails;
  };
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  type: LeaveType;
  status: LeaveStatus;
  days?: number;
  hours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestData {
  startDate: string;
  endDate: string;
  reason: string;
  type?: LeaveType;
  hours?: number;
}

export interface BalanceType {
  total: number;
  used: number;
  remaining: number;
  label: string;
  unit: string;
  color: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}