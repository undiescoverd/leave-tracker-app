"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, ArrowLeft, AlertTriangle, Info } from "lucide-react";

interface EmployeeBalance {
  id: string;
  name: string;
  email: string;
  department: string;
  annualLeave: {
    used: number;
    total: number;
    remaining: number;
    percentage: number;
  };
  toilBalance: number;
  sickLeave: {
    used: number;
    total: number;
    remaining: number;
    percentage: number;
  };
  unpaidLeave2025: number;
  status: {
    level: string;
    color: string;
    icon: string;
  };
}

interface Warning {
  type: string;
  message: string;
  severity: string;
  employeeId: string;
}

interface EmployeeBalancesData {
  employees: EmployeeBalance[];
  ukCoverageWarnings: Warning[];
  summary: {
    totalEmployees: number;
    ukAgents: number;
    criticalStatus: number;
    warningStatus: number;
  };
}

export default function EmployeeBalancesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EmployeeBalancesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchEmployeeBalances();
  }, [status, session, router]);

  const fetchEmployeeBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/employee-balances');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch employee balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: EmployeeBalance['status']) => {
    const variants = {
      good: 'default',
      medium: 'secondary',
      critical: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status.level as keyof typeof variants] || 'default'}>
        {status.icon} {status.level.charAt(0).toUpperCase() + status.level.slice(1)}
      </Badge>
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
              <h1 className="text-xl font-semibold text-foreground">
                Employee Leave Balances
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session.user?.name || session.user?.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Summary Cards */}
          {data && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">Active team members</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">UK Agents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.ukAgents}</div>
                  <p className="text-xs text-muted-foreground">Coverage critical</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Warning Status</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{data.summary.warningStatus}</div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Status</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{data.summary.criticalStatus}</div>
                  <p className="text-xs text-muted-foreground">Urgent action</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* UK Coverage Warnings */}
          {data && data.ukCoverageWarnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">UK Coverage Alerts</h3>
              {data.ukCoverageWarnings.map((warning, index) => (
                <Alert key={index} variant={warning.severity === 'warning' ? 'destructive' : 'default'}>
                  {warning.severity === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Employee Balances Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Balances</CardTitle>
              <CardDescription>
                Current leave status for all team members (Admins excluded)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : data && data.employees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Annual Leave</TableHead>
                      <TableHead>TOIL Balance</TableHead>
                      <TableHead>Sick Leave</TableHead>
                      <TableHead>Unpaid (2025)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{employee.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {employee.department}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {employee.annualLeave.used}/{employee.annualLeave.total}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.annualLeave.remaining} remaining ({employee.annualLeave.percentage}%)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {employee.toilBalance}h
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {employee.sickLeave.used}/{employee.sickLeave.total}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.sickLeave.remaining} remaining ({employee.sickLeave.percentage}%)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {employee.unpaidLeave2025} days
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(employee.status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/employee/${employee.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No employee data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}