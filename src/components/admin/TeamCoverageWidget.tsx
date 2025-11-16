"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface CoverageDay {
  date: string;
  dayOfWeek: string;
  coverage: number;
  employeesOnLeave: Array<{
    name: string;
    type: string;
    critical: boolean;
  }>;
  critical: boolean;
}

interface TeamCoverageWidgetProps {
  daysToShow?: number;
}

export default function TeamCoverageWidget({ daysToShow = 14 }: TeamCoverageWidgetProps) {
  const router = useRouter();
  const [coverageData, setCoverageData] = useState<CoverageDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateCoverageData();
  }, [daysToShow]);

  const generateCoverageData = async () => {
    try {
      const response = await fetch('/api/admin/upcoming-leave');
      let upcomingLeave = [];
      
      if (response.ok) {
        const data = await response.json();
        upcomingLeave = data.upcomingLeave || [];
      }

      // Generate coverage data for the next days based on real leave data
      const data: CoverageDay[] = [];
      const today = new Date();
      
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';
        
        // Find employees on leave for this date
        const employeesOnLeave = upcomingLeave.filter((leave: any) => {
          return dateStr >= leave.startDate && dateStr <= leave.endDate;
        }).map((leave: any) => ({
          name: leave.name,
          type: leave.type,
          critical: leave.type === 'SICK' || leave.type === 'EMERGENCY'
        }));
        
        const coverage = isWeekend ? 100 : Math.max(60, 100 - (employeesOnLeave.length * 25));
        const critical = coverage < 70;
        
        data.push({
          date: dateStr,
          dayOfWeek,
          coverage,
          employeesOnLeave,
          critical
        });
      }
      
      setCoverageData(data);
    } catch (error) {
      console.error('Failed to generate coverage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return "text-green-600";
    if (coverage >= 70) return "text-yellow-600"; 
    return "text-red-600";
  };

  const getCoverageVariant = (coverage: number) => {
    if (coverage >= 90) return "default";
    if (coverage >= 70) return "secondary";
    return "destructive";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coverage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Team Coverage Overview
              </CardTitle>
              <CardDescription>
                Monitor team availability for the next {daysToShow} days
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push("/admin/coverage")}
            >
              View Full Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Coverage Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {coverageData.filter(d => d.coverage >= 90).length}
              </div>
              <p className="text-xs text-muted-foreground">Days with full coverage</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {coverageData.filter(d => d.coverage >= 70 && d.coverage < 90).length}
              </div>
              <p className="text-xs text-muted-foreground">Days with reduced coverage</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {coverageData.filter(d => d.coverage < 70).length}
              </div>
              <p className="text-xs text-muted-foreground">Days with critical coverage</p>
            </div>
          </div>

          {/* Coverage Calendar Grid */}
          <div className="grid gap-3 md:grid-cols-7">
            {coverageData.slice(0, 7).map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">{day.dayOfWeek}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                </div>
                
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="text-center">
                    <span className={`text-lg font-bold ${getCoverageColor(day.coverage)}`}>
                      {day.coverage}%
                    </span>
                  </div>
                  
                  <Progress value={day.coverage} className="h-2" />
                  
                  {day.employeesOnLeave.length > 0 && (
                    <div className="space-y-1">
                      {day.employeesOnLeave.map((employee, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{employee.name}</p>
                            <Badge 
                              variant={employee.critical ? "destructive" : "secondary"} 
                              className="text-xs"
                            >
                              {employee.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {day.employeesOnLeave.length === 0 && (
                    <div className="text-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Full team</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Second Week Preview */}
          {daysToShow > 7 && (
            <div className="mt-6">
              <h5 className="text-sm font-medium text-foreground mb-3">Next Week Preview</h5>
              <div className="grid gap-3 md:grid-cols-7">
                {coverageData.slice(7, 14).map((day) => (
                  <div key={day.date} className="space-y-2">
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground">{day.dayOfWeek}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                    </div>
                    
                    <div className="p-2 border rounded text-center">
                      <span className={`text-sm font-medium ${getCoverageColor(day.coverage)}`}>
                        {day.coverage}%
                      </span>
                      {day.critical && (
                        <AlertTriangle className="h-3 w-3 text-red-600 mx-auto mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Coverage Alerts */}
      {coverageData.some(d => d.critical) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Coverage Alerts
            </CardTitle>
            <CardDescription>
              Days with critically low team coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coverageData
                .filter(d => d.critical)
                .map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(day.date)} ({day.dayOfWeek})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.employeesOnLeave.map(e => e.name).join(', ')} on leave
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{day.coverage}% coverage</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Action needed</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}