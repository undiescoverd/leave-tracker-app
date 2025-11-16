"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function SeedDataPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
interface SeedResult {
    message: string;
    summary: {
      usersProcessed: number;
      totalLeaveRequests: number;
      totalToilEntries: number;
      pendingRequests: number;
      pendingToilEntries: number;
    };
    users: string[];
  }

  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seedComprehensiveData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/comprehensive-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to seed data');
      }
    } catch (err) {
      console.error('Seed data error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/login");
    }
  }, [session, router, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                Seed Test Data
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/admin")}>
                Back to Admin
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Comprehensive Test Data Seeding
              </CardTitle>
              <CardDescription>
                This will add extensive dummy leave data for thorough testing across all dashboards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What this will add:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 15+ leave requests per user (2024 historical + 2025 current)</li>
                  <li>• Multiple unpaid leave requests (6 days per user)</li>
                  <li>• Pending requests (will appear in pending dashboard)</li>
                  <li>• TOIL entries (approved + pending)</li>
                  <li>• Proper balance calculations</li>
                  <li>• Realistic date ranges and scenarios</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Warning
                </h4>
                <p className="text-sm text-muted-foreground">
                  This will clear existing leave requests and TOIL entries for regular users to ensure clean test data.
                </p>
              </div>

              <Button 
                onClick={seedComprehensiveData}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding Data...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Comprehensive Test Data
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{result.message}</p>
                      <div className="text-sm">
                        <p>• Processed {result.summary.usersProcessed} users: {result.users.join(', ')}</p>
                        <p>• Added {result.summary.totalLeaveRequests} leave requests</p>
                        <p>• Added {result.summary.totalToilEntries} TOIL entries</p>
                        <p>• Created {result.summary.pendingRequests} pending requests</p>
                        <p>• Created {result.summary.pendingToilEntries} pending TOIL entries</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="font-medium">Test these areas:</p>
                        <div className="space-y-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push("/admin/employee-balances")}
                          >
                            Employee Balances
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push("/admin/pending-requests")}
                          >
                            Pending Requests
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push("/admin/toil")}
                          >
                            TOIL Management
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}