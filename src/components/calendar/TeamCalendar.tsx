"use client";

import { useState, useEffect } from "react";
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
  APPROVED: 'opacity-100',
  PENDING: 'opacity-70 bg-stripes',
  REJECTED: 'opacity-40',
};

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'REJECTED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/team-leave?month=${currentMonth}&year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }
      
      const data = await response.json();
      setCalendarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from the beginning of the week
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateKey = date.toISOString().split('T')[0];
      const events = calendarData?.eventsByDate?.[dateKey] || [];
      
      days.push({
        date: date,
        dateKey: dateKey,
        isCurrentMonth: date.getMonth() === currentMonth,
        isToday: date.getTime() === today.getTime(),
        events: events,
      });
    }
    
    return days;
  };

  const renderLeaveEvent = (event: LeaveEvent, index: number) => {
    const color = LEAVE_TYPE_COLORS[event.type as keyof typeof LEAVE_TYPE_COLORS] || 'bg-gray-500';
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
        {event.user.name.split(' ')[0]} • {event.type}
      </div>
    );
  };

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
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
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

  const days = getDaysInMonth();

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
            
            <div className="text-lg font-semibold min-w-[140px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            
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
            <span>Annual Leave</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Sick Leave</span>
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
            <div className="w-3 h-3 bg-muted border-2 border-muted-foreground rounded"></div>
            <span>Pending</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center font-medium text-muted-foreground py-2 text-sm">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[80px] p-1 border rounded transition-colors
                ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                ${day.isToday ? 'ring-2 ring-primary' : 'border-border'}
                hover:bg-accent/50
              `}
            >
              <div className={`
                text-sm font-medium mb-1
                ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                ${day.isToday ? 'text-primary font-bold' : ''}
              `}>
                {day.date.getDate()}
              </div>
              
              <div className="space-y-0.5">
                {day.events.slice(0, 3).map((event, eventIndex) => 
                  renderLeaveEvent(event, eventIndex)
                )}
                {day.events.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {calendarData && calendarData.totalEvents > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">This month:</span>
                </div>
                <span className="font-medium">{calendarData.totalEvents} leave requests</span>
              </div>
              <div className="text-muted-foreground">
                Click on dates to view details
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}