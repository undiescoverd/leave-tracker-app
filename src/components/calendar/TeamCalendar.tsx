"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface CalendarData {
  month: number;
  year: number;
  events: LeaveEvent[];
  eventsByDate: Record<string, LeaveEvent[]>;
  totalEvents: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEAVE_TYPE_COLORS = {
  ANNUAL: 'bg-blue-500',
  SICK: 'bg-success',
  TOIL: 'bg-purple-500',
  UNPAID: 'bg-gray-500',
};

const STATUS_STYLES = {
  APPROVED: 'opacity-100 border-0',
  PENDING: 'opacity-90 border-2 border-dashed border-orange-500 relative !bg-opacity-50',
  REJECTED: 'opacity-40 line-through',
};

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Next month for dual display
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Fetch data for both current and next month
      const [currentResponse, nextResponse] = await Promise.all([
        fetch(`/api/calendar/team-leave?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/calendar/team-leave?month=${nextMonth}&year=${nextYear}`)
      ]);
      
      if (!currentResponse.ok || !nextResponse.ok) {
        const errorMsg = !currentResponse.ok ? 
          `Current month error: ${currentResponse.status}` : 
          `Next month error: ${nextResponse.status}`;
        throw new Error(`Failed to fetch calendar data - ${errorMsg}`);
      }
      
      const currentData = await currentResponse.json();
      const nextData = await nextResponse.json();
      
      // Validate data structure and provide fallbacks
      const currentEvents = Array.isArray(currentData?.events) ? currentData.events : [];
      const nextEvents = Array.isArray(nextData?.events) ? nextData.events : [];
      const currentEventsByDate = currentData?.eventsByDate || {};
      const nextEventsByDate = nextData?.eventsByDate || {};
      const currentTotalEvents = currentData?.totalEvents || 0;
      const nextTotalEvents = nextData?.totalEvents || 0;
      
      // Combine data from both months
      const combinedData = {
        month: currentMonth,
        year: currentYear,
        events: [...currentEvents, ...nextEvents],
        eventsByDate: { ...currentEventsByDate, ...nextEventsByDate },
        totalEvents: currentTotalEvents + nextTotalEvents,
        nextMonthData: nextData
      };
      
      setCalendarData(combinedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Calendar fetch error:', errorMessage);
      setError('Failed to load calendar: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate]);

  const generateMonthDays = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from the beginning of the week
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const daysArray = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateKey = date.toISOString().split('T')[0];
      const events = calendarData?.eventsByDate?.[dateKey] || [];
      
      daysArray.push({
        date: date,
        dateKey: dateKey,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        events: events,
      });
    }
    
    return daysArray;
  };

  const currentMonthDays = useMemo(() => 
    generateMonthDays(currentMonth, currentYear), 
    [currentMonth, currentYear, calendarData]
  );
  
  const nextMonthDays = useMemo(() => 
    generateMonthDays(nextMonth, nextYear), 
    [nextMonth, nextYear, calendarData]
  );

  const renderLeaveEvent = useCallback((event: LeaveEvent, index: number) => {
    const color = LEAVE_TYPE_COLORS[event.type as keyof typeof LEAVE_TYPE_COLORS] || 'bg-gray-500';
    
    // Handle pending status with distinct styling
    if (event.status === 'PENDING') {
      return (
        <div
          key={`${event.id}-${index}`}
          className="text-xs px-1 py-0.5 rounded mb-0.5 cursor-pointer truncate
                     border-2 border-dashed border-orange-500 bg-orange-500/20 text-orange-900
                     hover:bg-orange-500/30 transition-colors relative"
          title={`${event.user.name}: ${event.type} (PENDING APPROVAL)`}
        >
          {event.user.name.split(' ')[0]}
          <span className="absolute -top-1 -right-1 text-xs bg-orange-500 text-white px-1 rounded-full leading-none">
            ?
          </span>
        </div>
      );
    }
    
    // Handle approved and rejected statuses
    const statusStyle = STATUS_STYLES[event.status as keyof typeof STATUS_STYLES] || '';
    
    return (
      <div
        key={`${event.id}-${index}`}
        className={`
          text-xs px-1 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer
          ${color} ${statusStyle}
          hover:opacity-90 transition-opacity
        `}
        title={`${event.user.name}: ${event.type} (${event.status})`}
      >
        {event.user.name.split(' ')[0]}
      </div>
    );
  }, []);

  const renderMonthGrid = (days: any[], monthName: string, year: number) => (
    <div className="flex-1 min-w-0">
      {/* Month Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">{monthName} {year}</h3>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center font-medium text-muted-foreground py-2 text-xs">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[70px] p-1 border rounded transition-colors
              ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
              ${day.isToday ? 'ring-2 ring-primary' : 'border-border'}
              hover:bg-accent/50
            `}
          >
            <div className={`
              text-xs font-medium mb-1
              ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
              ${day.isToday ? 'text-primary font-bold' : ''}
            `}>
              {day.date.getDate()}
            </div>
            
            <div className="space-y-0.5">
              {day.events.slice(0, 2).map((event, eventIndex) => 
                renderLeaveEvent(event, eventIndex)
              )}
              {day.events.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{day.events.length - 2}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Team Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-muted rounded w-1/3 mx-auto"></div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-muted rounded w-1/3 mx-auto"></div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Team Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-center py-8">
            <p>Error loading calendar: {error}</p>
            <Button onClick={fetchCalendarData} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Team Calendar</span>
            {calendarData && (
              <Badge variant="secondary" className="ml-2">
                <Users className="h-3 w-3 mr-1" />
                {calendarData.totalEvents} requests
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Annual</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Sick</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>TOIL</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Unpaid</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 bg-opacity-30 border-2 border-dashed border-orange-400 rounded relative">
              <span className="absolute -top-1 -right-1 text-xs bg-orange-500 text-white rounded-full leading-none w-2 h-2"></span>
            </div>
            <span>Pending</span>
          </div>
        </div>

        {/* Dual Calendar Layout */}
        <div className="flex space-x-6">
          {renderMonthGrid(currentMonthDays, MONTHS[currentMonth], currentYear)}
          {renderMonthGrid(nextMonthDays, MONTHS[nextMonth], nextYear)}
        </div>

        {/* Summary */}
        {calendarData && calendarData.totalEvents > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Showing:</span>
                </div>
                <span className="font-medium">{calendarData.totalEvents} leave requests</span>
              </div>
              <div className="text-muted-foreground">
                Two-month view
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}