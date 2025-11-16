import { summarizeLeaveBalance } from "@/lib/leave-balance";
import type { LeaveBalanceData } from "@/hooks/useLeaveBalance";

describe("summarizeLeaveBalance", () => {
  it("returns sensible defaults when balance is undefined", () => {
    const summary = summarizeLeaveBalance(undefined);

    expect(summary.metrics).toHaveLength(3);
    expect(summary.metrics[0]).toMatchObject({
      key: "annual",
      remaining: 32,
      unit: "days",
    });
    expect(summary.metrics[2]).toMatchObject({
      key: "toil",
      remaining: 40,
      unit: "hours",
    });
    expect(summary.totalDaysAvailable).toBeCloseTo(32 + 3 + 40 / 8, 1);
  });

  it("calculates pending totals and percent used", () => {
    const balance: LeaveBalanceData = {
      totalAllowance: 32,
      daysUsed: 8,
      remaining: 24,
      balances: {
        annual: { total: 32, used: 8, remaining: 24 },
        sick: { total: 5, used: 2, remaining: 3 },
        toil: { total: 16, used: 4, remaining: 12 },
      },
      pending: {
        annual: 2,
        sick: 1,
        toil: 4,
        total: 7,
      },
    };

    const summary = summarizeLeaveBalance(balance);

    const annualMetric = summary.metrics.find((metric) => metric.key === "annual");
    expect(annualMetric?.percentUsed).toBe(25);
    expect(annualMetric?.pending).toBe(2);

    expect(summary.pendingTotal).toBe(7);
    expect(summary.totalDaysAvailable).toBeCloseTo(24 + 3 + 12 / 8, 1);
  });

  it("builds totals when total is missing but remaining exists", () => {
    const balance: LeaveBalanceData = {
      totalAllowance: 30,
      daysUsed: 10,
      remaining: 20,
      pending: { annual: 0, sick: 0, toil: 0, total: 0 },
    };

    const summary = summarizeLeaveBalance(balance);
    const annualMetric = summary.metrics.find((metric) => metric.key === "annual");

    expect(annualMetric?.total).toBeGreaterThanOrEqual(20);
    expect(summary.metrics.every((metric) => metric.percentUsed >= 0)).toBe(true);
  });
});

