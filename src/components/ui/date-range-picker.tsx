"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { DateRange, Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTeamCalendarForDateRange } from "@/hooks/useTeamCalendarForDateRange"

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (dateRange: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  className?: string
  showTeamCalendar?: boolean
  defaultMonth?: Date
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick dates",
  disabled = false,
  minDate,
  className,
  showTeamCalendar = true,
  defaultMonth,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(dateRange)

  // Calculate date range for team calendar data fetch
  // Use defaultMonth or fallback to current month
  const calendarStartDate = React.useMemo(() => {
    const baseMonth = defaultMonth || new Date()
    return startOfMonth(baseMonth)
  }, [defaultMonth])

  // Calculate end date (2 months displayed in calendar)
  const calendarEndDate = React.useMemo(() => {
    return endOfMonth(addMonths(calendarStartDate, 1)) // numberOfMonths - 1
  }, [calendarStartDate])

  // Fetch team calendar data
  const { eventsByDate, isLoading: isLoadingTeamCalendar } = useTeamCalendarForDateRange({
    startDate: calendarStartDate,
    endDate: calendarEndDate,
    enabled: showTeamCalendar && open, // Only fetch when popover is open
    bufferDays: 7, // Add 7 days buffer for smooth navigation
  })

  // Create modifiers for team calendar indicators
  const modifiers = React.useMemo(() => {
    if (!showTeamCalendar) {
      return {}
    }

    return {
      hasTeamLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return !!eventsByDate[dateKey]?.length
      },
      hasPendingLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return eventsByDate[dateKey]?.some(e => e.status === 'PENDING') || false
      },
      hasApprovedLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return eventsByDate[dateKey]?.some(e => e.status === 'APPROVED') || false
      },
      hasMultipleLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return (eventsByDate[dateKey]?.length || 0) >= 2
      },
    }
  }, [showTeamCalendar, eventsByDate])

  // Apply visual styling for team calendar indicators
  const modifiersClassNames = React.useMemo(() => {
    if (!showTeamCalendar) {
      return {}
    }

    return {
      hasTeamLeave: 'relative',
      hasPendingLeave: 'after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-yellow-500 after:rounded-full',
      hasApprovedLeave: 'after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full',
      hasMultipleLeave: 'after:w-2 after:h-2', // Larger dot for multiple people
    }
  }, [showTeamCalendar])

  // Sync tempRange when dateRange prop changes externally
  React.useEffect(() => {
    setTempRange(dateRange)
  }, [dateRange])

  // Reset temp range when popover opens
  React.useEffect(() => {
    if (open) {
      setTempRange(dateRange)
    }
  }, [open, dateRange])

  const handleAccept = () => {
    onDateRangeChange?.(tempRange)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempRange(dateRange) // Reset to original
    setOpen(false)
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from || defaultMonth}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            disabled={(date) =>
              minDate ? date < minDate : false
            }
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              nav: "space-x-1 flex items-center",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              day_range_start: "day-range-start rounded-l-md",
              day_range_end: "day-range-end rounded-r-md",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
              day_hidden: "invisible",
            }}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
            >
              Accept
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}