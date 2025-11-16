"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CalendarLoadingSkeleton } from "@/components/ui/loading-states";
import { toast } from "sonner";
import { useTeamCalendar } from "@/hooks/useTeamCalendar";

interface LeaveEvent {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  comments?: string;
  hours?: number;
}

interface CalendarDayProps {
  day: number;
  events: LeaveEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

const CalendarDay = memo(function CalendarDay({ day, events, isCurrentMonth, isToday }: CalendarDayProps) {
  const dayEvents = useMemo(() => events || [], [events]);
  
  return (
    <div className={`min-h-[100px] p-2 border border-border ${
      isCurrentMonth ? 'bg-background' : 'bg-muted/30'
    } ${isToday ? 'ring-2 ring-primary' : ''}`}>
      <div className={`text-sm font-medium mb-1 ${
        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
      } ${isToday ? 'text-primary font-bold' : ''}`}>
        {day}
      </div>
      
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={`text-xs p-1 rounded truncate ${
              event.status === 'APPROVED' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : event.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
            title={`${event.user.name} - ${event.type} (${event.status})`}
          >
            {event.user.name}
          </div>
        ))}
        
        {dayEvents.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{dayEvents.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
});

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const CalendarHeader = memo(function CalendarHeader({ 
  month, 
  year, 
  onPreviousMonth, 
  onNextMonth, 
  onRefresh, 
  isLoading 
}: CalendarHeaderProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">
        {monthNames[month - 1]} {year}
      </h3>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousMonth}
          disabled={isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextMonth}
          disabled={isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

interface CalendarStatsProps {
  data: {
    totalRequests: number;
    events: LeaveEvent[];
  } | undefined;
}

const CalendarStats = memo(function CalendarStats({ data }: CalendarStatsProps) {
  const stats = useMemo(() => {
    if (!data) return { total: 0, approved: 0, pending: 0 };
    
    const approved = data.events.filter(e => e.status === 'APPROVED').length;
    const pending = data.events.filter(e => e.status === 'PENDING').length;
    
    return {
      total: data.totalRequests,
      approved,
      pending
    };
  }, [data]);

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        <div className="text-sm text-muted-foreground">Total Requests</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        <div className="text-sm text-muted-foreground">Approved</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        <div className="text-sm text-muted-foreground">Pending</div>
      </div>
    </div>
  );
});

const TeamCalendarOptimized = memo(function TeamCalendarOptimized() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const {
    data: calendarData,
    isLoading,
    error,
    refetch
  } = useTeamCalendar({
    month: currentMonth,
    year: currentYear,
    enabled: true,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 1) {
        setCurrentYear(prevYear => prevYear - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 12) {
        setCurrentYear(prevYear => prevYear + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Calendar refreshed');
  }, [refetch]);

  const calendarDays = useMemo(() => {
    if (!calendarData) return [];

    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayEvents = calendarData.eventsByDate?.[dateStr] || [];
      
      days.push({
        day: currentDate.getDate(),
        events: dayEvents,
        isCurrentMonth: currentDate.getMonth() === currentMonth - 1,
        isToday: currentDate.toDateString() === new Date().toDateString()
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [calendarData, currentMonth, currentYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarLoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Failed to load calendar data</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Team Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarHeader
            month={currentMonth}
            year={currentYear}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />

          <CalendarStats data={calendarData} />

          <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => (
              <CalendarDay
                key={index}
                day={day.day}
                events={day.events}
                isCurrentMonth={day.isCurrentMonth}
                isToday={day.isToday}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
});

export default TeamCalendarOptimized;
