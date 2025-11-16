import type { LeaveBalanceData } from "@/hooks/useLeaveBalance";

export type LeaveBalanceMetricKey = "annual" | "sick" | "toil";

export interface LeaveBalanceMetric {
  key: LeaveBalanceMetricKey;
  label: string;
  unit: "days" | "hours";
  total: number;
  used: number;
  remaining: number;
  pending: number;
  percentUsed: number;
}

export interface LeaveBalanceSummary {
  metrics: LeaveBalanceMetric[];
  totalDaysAvailable: number;
  pendingTotal: number;
}

const DEFAULTS = {
  annual: { total: 32, used: 0, remaining: 32 },
  sick: { total: 3, used: 0, remaining: 3 },
  toil: { total: 40, used: 0, remaining: 40 }, // tracked in hours
};

function createMetric(options: {
  key: LeaveBalanceMetricKey;
  label: string;
  unit: "days" | "hours";
  source: { total?: number; used?: number; remaining?: number };
  pending?: number;
}): LeaveBalanceMetric {
  const { key, label, unit, source, pending = 0 } = options;
  const total = Math.max(0, source.total ?? source.used ?? 0);
  const used = Math.max(0, source.used ?? 0);
  const remaining = Math.max(0, source.remaining ?? Math.max(total - used, 0));
  const safeTotal = total || used + remaining;
  const percentUsed = safeTotal > 0 ? Math.min(100, Math.round((used / safeTotal) * 100)) : 0;

  return {
    key,
    label,
    unit,
    total: safeTotal,
    used,
    remaining,
    pending: Math.max(0, pending),
    percentUsed,
  };
}

export function summarizeLeaveBalance(balance?: LeaveBalanceData): LeaveBalanceSummary {
  const annual = balance?.balances?.annual ?? {
    total: balance?.totalAllowance ?? DEFAULTS.annual.total,
    used: balance?.daysUsed ?? DEFAULTS.annual.used,
    remaining: balance?.remaining ?? DEFAULTS.annual.remaining,
  };

  const sick = balance?.balances?.sick ?? DEFAULTS.sick;
  const toil = balance?.balances?.toil ?? DEFAULTS.toil;
  const pending = balance?.pending ?? { annual: 0, sick: 0, toil: 0, total: 0 };

  const metrics: LeaveBalanceMetric[] = [
    createMetric({
      key: "annual",
      label: "Annual Leave",
      unit: "days",
      source: annual,
      pending: pending.annual,
    }),
    createMetric({
      key: "sick",
      label: "Sick Leave",
      unit: "days",
      source: sick,
      pending: pending.sick,
    }),
    createMetric({
      key: "toil",
      label: "TOIL",
      unit: "hours",
      source: toil,
      pending: pending.toil,
    }),
  ];

  const totalDaysAvailable = Number(
    (
      (annual?.remaining ?? DEFAULTS.annual.remaining) +
      (sick?.remaining ?? DEFAULTS.sick.remaining) +
      ((toil?.remaining ?? DEFAULTS.toil.remaining) / 8)
    ).toFixed(1)
  );

  const pendingTotal =
    pending.total ?? (pending.annual || 0) + (pending.sick || 0) + (pending.toil || 0);

  return {
    metrics,
    totalDaysAvailable,
    pendingTotal,
  };
}

