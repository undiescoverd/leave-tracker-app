"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { features } from "@/lib/features";
import { calculateWorkingDays } from "@/lib/date-utils";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { useSubmitLeaveRequest, useSubmitBulkLeaveRequest } from "@/hooks/useLeaveRequests";
import { useTeamCalendarForDateRange } from "@/hooks/useTeamCalendarForDateRange";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TOILForm } from "@/components/leave/toil/TOILForm";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Plus, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

function LeaveRequestFormInternal({ onSuccess }: LeaveRequestFormProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { data: leaveBalance, isLoading: isLoadingBalance, error: balanceError } = useLeaveBalance(session?.user?.id || '');
  const submitRequestMutation = useSubmitLeaveRequest();
  const submitBulkRequestMutation = useSubmitBulkLeaveRequest();
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'TOIL' | 'SICK' | 'BULK'>('ANNUAL');
  const [formData, setFormData] = useState({
    dateRange: undefined as DateRange | undefined,
    comments: "",
    type: "ANNUAL" as "ANNUAL" | "TOIL" | "SICK",
    hours: "" as string | number,
  });
  const [bulkRequests, setBulkRequests] = useState<Array<{
    id: string;
    dateRange: DateRange | undefined;
    reason: string;
  }>>([{ id: Date.now().toString(), dateRange: undefined, reason: "" }]);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

  // Get available leave types based on feature flags
  const availableLeaveTypes = features.getAvailableLeaveTypes();

  // Calculate date range for team calendar data fetch
  const calendarStartDate = useMemo(() => {
    const baseMonth = formData.dateRange?.from || new Date();
    return startOfMonth(baseMonth);
  }, [formData.dateRange?.from]);

  const calendarEndDate = useMemo(() => {
    return endOfMonth(addMonths(calendarStartDate, 1)); // 2 months displayed
  }, [calendarStartDate]);

  // Fetch team calendar data
  const { eventsByDate } = useTeamCalendarForDateRange({
    startDate: calendarStartDate,
    endDate: calendarEndDate,
    enabled: isOpen, // Only fetch when dialog is open
    bufferDays: 7,
  });

  // Create modifiers for team calendar indicators
  const calendarModifiers = useMemo(() => {
    return {
      hasTeamLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return !!eventsByDate[dateKey]?.length;
      },
      hasPendingLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return eventsByDate[dateKey]?.some(e => e.status === 'PENDING') || false;
      },
      hasApprovedLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return eventsByDate[dateKey]?.some(e => e.status === 'APPROVED') || false;
      },
      hasMultipleLeave: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return (eventsByDate[dateKey]?.length || 0) >= 2;
      },
    };
  }, [eventsByDate]);

  // Apply visual styling for team calendar indicators
  const calendarModifiersClassNames = useMemo(() => {
    return {
      hasTeamLeave: 'relative',
      hasPendingLeave: 'after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-yellow-500 after:rounded-full',
      hasApprovedLeave: 'after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full',
      hasMultipleLeave: 'after:w-2 after:h-2', // Larger dot for multiple people
    };
  }, []);

  // Fetch available users for TOIL form (excluding current user)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.id) {
        console.log('No session user ID, skipping colleague fetch');
        return;
      }

      console.log('Fetching colleagues for user:', session.user.id);
      setLoadingUsers(true);
      try {
        const response = await fetch('/api/users/colleagues');
        console.log('Colleagues API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Colleagues API response data:', data);

          if (data.success && data.data.users) {
            const users = data.data.users.map((user: any) => ({
              id: user.id,
              name: user.name
            }));
            console.log('Setting available users:', users);
            setAvailableUsers(users);
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch colleagues:', response.status, errorData);
          showError('Failed to load available colleagues');
        }
      } catch (error) {
        console.error('Error fetching colleagues:', error);
        showError('Failed to load available colleagues');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session?.user?.id]);

  // Calculate leave days for preview
  const calculatePreviewDays = () => {
    if (!formData.dateRange?.from || !formData.dateRange?.to) return 0;
    
    if (formData.dateRange.to < formData.dateRange.from) return 0;
    
    return calculateWorkingDays(formData.dateRange.from, formData.dateRange.to);
  };

  // Get remaining balance for selected leave type
  const getRemainingBalance = () => {
    if (!leaveBalance) return 0;
    
    // Determine the current leave type based on tab or formData
    const currentLeaveType = leaveType === 'SICK' ? 'SICK' : (leaveType === 'ANNUAL' ? 'ANNUAL' : (leaveType === 'TOIL' ? 'TOIL' : formData.type));
    
    if (features.isMultiLeaveTypeEnabled() && leaveBalance.balances) {
      switch (currentLeaveType) {
        case 'TOIL':
          return leaveBalance.balances.toil?.remaining ?? 0;
        case 'SICK':
          return leaveBalance.balances.sick?.remaining ?? 0;
        default:
          return leaveBalance.balances.annual.remaining;
      }
    }
    
    return leaveBalance.remaining;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine the leave type based on current tab or formData
    const leaveTypeForSubmit = leaveType === 'SICK' ? 'SICK' : (leaveType === 'ANNUAL' ? 'ANNUAL' : formData.type);
    
    // Enhanced client-side validation
    if (!formData.dateRange?.from || !formData.dateRange?.to) {
      showError("Please select your leave dates");
      return;
    }

    const startDate = formData.dateRange.from;
    const endDate = formData.dateRange.to;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      showError("Start date cannot be in the past");
      return;
    }
    
    if (endDate < startDate) {
      showError("End date must be after or equal to start date");
      return;
    }

    const previewDays = calculatePreviewDays();
    if (previewDays === 0) {
      showError("Please select valid dates for your leave request");
      return;
    }

    // Validate comments/reason is not empty
    if (!formData.comments || formData.comments.trim().length === 0) {
      showError("Please provide a reason for your leave request");
      return;
    }

    // Validate TOIL hours if applicable
    if (leaveTypeForSubmit === 'TOIL' && formData.hours) {
      const hours = Number(formData.hours);
      if (hours <= 0 || hours > 24) {
        showError("TOIL hours must be between 1 and 24");
        return;
      }
    }

    const requestData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: formData.comments, // API expects 'reason' field
      type: leaveTypeForSubmit,
      ...(leaveTypeForSubmit === 'TOIL' && formData.hours && { hours: Number(formData.hours) })
    };

    try {
      await submitRequestMutation.mutateAsync(requestData);
      showSuccess(`${leaveTypeForSubmit} leave request submitted successfully!`);
      setFormData({
        dateRange: undefined,
        comments: "",
        type: leaveTypeForSubmit,
        hours: "",
      });
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showError(error instanceof Error ? error.message : "An error occurred while submitting your request");
    }
  };

  // Handle bulk leave request submission
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty entries and validate
    const validRequests = bulkRequests.filter(
      (req) => req.dateRange?.from && req.dateRange?.to && req.reason.trim()
    );

    if (validRequests.length === 0) {
      showError("Please add at least one leave request with dates and reason");
      return;
    }

    // Validate all requests
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < validRequests.length; i++) {
      const req = validRequests[i];
      if (!req.dateRange?.from || !req.dateRange?.to) continue;

      if (req.dateRange.from < today) {
        showError(`Request ${i + 1}: Start date cannot be in the past`);
        return;
      }

      if (req.dateRange.to < req.dateRange.from) {
        showError(`Request ${i + 1}: End date must be after or equal to start date`);
        return;
      }
    }

    try {
      const bulkData = {
        requests: validRequests.map((req) => ({
          startDate: req.dateRange!.from!.toISOString(),
          endDate: req.dateRange!.to!.toISOString(),
          reason: req.reason.trim(),
          type: formData.type,
        })),
        type: formData.type,
      };

      await submitBulkRequestMutation.mutateAsync(bulkData);
      
      // Reset form
      setBulkRequests([{ id: Date.now().toString(), dateRange: undefined, reason: "" }]);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting bulk leave requests:", error);
      showError(error instanceof Error ? error.message : "An error occurred while submitting your requests");
    }
  };

  // Add new bulk request entry
  const addBulkRequest = () => {
    setBulkRequests([
      ...bulkRequests,
      { id: Date.now().toString(), dateRange: undefined, reason: "" },
    ]);
  };

  // Remove bulk request entry
  const removeBulkRequest = (id: string) => {
    if (bulkRequests.length > 1) {
      setBulkRequests(bulkRequests.filter((req) => req.id !== id));
    } else {
      showError("At least one request entry is required");
    }
  };

  // Update bulk request entry
  const updateBulkRequest = (id: string, field: 'dateRange' | 'reason', value: any) => {
    setBulkRequests(
      bulkRequests.map((req) =>
        req.id === id ? { ...req, [field]: value } : req
      )
    );
  };

  // Calculate total days for bulk requests
  const calculateBulkTotalDays = () => {
    return bulkRequests.reduce((total, req) => {
      if (req.dateRange?.from && req.dateRange?.to) {
        return total + calculateWorkingDays(req.dateRange.from, req.dateRange.to);
      }
      return total;
    }, 0);
  };

  // Handle TOIL form submission
  const handleTOILSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const requestData = {
        startDate: data.travelDate.toISOString(),
        endDate: data.returnDate?.toISOString() || data.travelDate.toISOString(),
        reason: data.reason,
        type: 'TOIL',
        hours: data.calculatedHours,
        scenario: data.scenario,
        coveringUserId: data.coveringUserId
      };

      const response = await fetch("/api/leave/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(result.data.message || "TOIL request submitted successfully!");
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        showError(result.error?.message || (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) || "Failed to submit TOIL request");
      }
    } catch (error) {
      console.error("Error submitting TOIL request:", error);
      showError("An error occurred while submitting your TOIL request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const previewDays = calculatePreviewDays();
  const remainingBalance = getRemainingBalance();

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="flex-1">
        Request Leave
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            // Reset bulk requests when dialog closes
            setBulkRequests([{ id: Date.now().toString(), dateRange: undefined, reason: "" }]);
            setLeaveType('ANNUAL');
          }
        }}
      >
        <DialogContent className="w-fit max-w-[90vw] max-h-[95vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>

{features.TOIL_REQUEST_ENABLED || features.SICK_LEAVE_ENABLED ? (
            <Tabs value={leaveType} onValueChange={(value) => setLeaveType(value as 'ANNUAL' | 'TOIL' | 'SICK' | 'BULK')}>
              <TabsList className={`grid w-full ${
                features.TOIL_REQUEST_ENABLED && features.SICK_LEAVE_ENABLED 
                  ? 'grid-cols-4' 
                  : (features.TOIL_REQUEST_ENABLED || features.SICK_LEAVE_ENABLED) 
                    ? 'grid-cols-3' 
                    : 'grid-cols-2'
              }`}>
                <TabsTrigger value="ANNUAL">Annual Leave</TabsTrigger>
                {features.TOIL_REQUEST_ENABLED && <TabsTrigger value="TOIL">TOIL</TabsTrigger>}
                {features.SICK_LEAVE_ENABLED && <TabsTrigger value="SICK">Sick Leave</TabsTrigger>}
                <TabsTrigger value="BULK">Bulk Request</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ANNUAL">
                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* Set form type to ANNUAL */}
                  <input type="hidden" name="type" value="ANNUAL" />
                  
                  {/* Date Selection */}
                  <div className="space-y-1">
                    <Label className="text-sm">Leave Dates</Label>
                    <DateRangePicker
                      dateRange={formData.dateRange}
                      onDateRangeChange={(dateRange) =>
                        setFormData(prev => ({ ...prev, dateRange, type: 'ANNUAL' }))
                      }
                      placeholder="Select start and end dates"
                      minDate={new Date()}
                      className="w-full"
                      defaultMonth={formData.dateRange?.from || new Date()}
                    />
                  </div>

                  {/* Balance Display */}
                  {leaveBalance && (
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Available annual leave:</span>
                          <span className="font-medium text-foreground">{remainingBalance} days</span>
                        </div>
                        {previewDays > 0 && (
                          <div className="flex justify-between mt-0.5">
                            <span>Requested:</span>
                            <span className="font-medium text-foreground">{previewDays} days</span>
                          </div>
                        )}
                        {previewDays > 0 && (
                          <div className="flex justify-between mt-0.5">
                            <span>Remaining:</span>
                            <span className={`font-medium ${(remainingBalance - previewDays) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                              {Math.max(0, remainingBalance - previewDays)} days
                            </span>
                          </div>
                        )}
                        {previewDays > 0 && remainingBalance < previewDays && (
                          <div className="text-destructive text-xs mt-0.5">
                            ⚠️ Insufficient balance
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Calendar */}
                  <div className="space-y-1">
                    <Label className="text-sm">Select Dates</Label>
                    <div className="w-full">
                      <Calendar
                        mode="range"
                        defaultMonth={formData.dateRange?.from}
                        selected={formData.dateRange}
                        onSelect={(range) =>
                          setFormData(prev => ({ ...prev, dateRange: range, type: 'ANNUAL' }))
                        }
                        numberOfMonths={2}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        modifiers={calendarModifiers}
                        modifiersClassNames={calendarModifiersClassNames}
                        className="rounded-md border w-full"
                      />
                    </div>
                    {/* Legend for team calendar indicators */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>Approved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Multiple</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-1">
                    <Label htmlFor="comments" className="text-sm">Reason</Label>
                    <Textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Please provide a reason for your leave request..."
                      required
                      className="text-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitRequestMutation.isPending || isLoadingBalance}
                      className="flex-1"
                    >
                      {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {features.TOIL_REQUEST_ENABLED && (
                <TabsContent value="TOIL">
                  <TOILForm
                    onSubmit={handleTOILSubmit}
                    onCancel={() => setIsOpen(false)}
                    availableUsers={availableUsers}
                    loading={loadingUsers}
                  />
                </TabsContent>
              )}

              {features.SICK_LEAVE_ENABLED && (
              <TabsContent value="SICK">
                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* Set form type to SICK */}
                  <input type="hidden" name="type" value="SICK" />
                  
                  {/* Date Selection */}
                  <div className="space-y-1">
                    <Label className="text-sm">Leave Dates</Label>
                    <DateRangePicker
                      dateRange={formData.dateRange}
                      onDateRangeChange={(dateRange) => {
                        setFormData(prev => ({ ...prev, dateRange, type: 'SICK' }))
                      }}
                      placeholder="Select start and end dates"
                      minDate={new Date()}
                      className="w-full"
                      defaultMonth={formData.dateRange?.from || new Date()}
                    />
                  </div>

                  {/* Balance Display */}
                  {leaveBalance && (
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Available sick leave:</span>
                          <span className="font-medium text-foreground">{getRemainingBalance()} days</span>
                        </div>
                        {previewDays > 0 && (
                          <div className="flex justify-between mt-0.5">
                            <span>Requested:</span>
                            <span className="font-medium text-foreground">{previewDays} days</span>
                          </div>
                        )}
                        {previewDays > 0 && (
                          <div className="flex justify-between mt-0.5">
                            <span>Remaining:</span>
                            <span className="font-medium text-foreground">
                              {Math.max(0, getRemainingBalance() - previewDays)} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Calendar */}
                  <div className="space-y-1">
                    <Label className="text-sm">Select Dates</Label>
                    <div className="w-full">
                      <Calendar
                        mode="range"
                        defaultMonth={formData.dateRange?.from}
                        selected={formData.dateRange}
                        onSelect={(range) => {
                          setFormData(prev => ({ ...prev, dateRange: range, type: 'SICK' }))
                        }}
                        numberOfMonths={2}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        modifiers={calendarModifiers}
                        modifiersClassNames={calendarModifiersClassNames}
                        className="rounded-md border w-full"
                      />
                    </div>
                    {/* Legend for team calendar indicators */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>Approved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Multiple</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-1">
                    <Label htmlFor="comments" className="text-sm">Reason</Label>
                    <Textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Please provide a reason for your sick leave request..."
                      required
                      className="text-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitRequestMutation.isPending || isLoadingBalance}
                      className="flex-1"
                    >
                      {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              )}

              <TabsContent value="BULK">
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Add multiple leave requests at once. Perfect for planning your leave for the year ahead.
                  </div>

                  {/* Leave Type Selection for Bulk */}
                  <div className="space-y-1">
                    <Label htmlFor="bulkType" className="text-sm">Leave Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as "ANNUAL" | "TOIL" | "SICK" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLeaveTypes.filter((type) => type && type.trim()).map((type: string) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bulk Requests List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {bulkRequests.map((req, index) => (
                      <div key={req.id} className="border rounded-md p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Request {index + 1}</Label>
                          {bulkRequests.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBulkRequest(req.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Date Range */}
                        <div className="space-y-1">
                          <Label className="text-xs">Leave Dates</Label>
                          <DateRangePicker
                            dateRange={req.dateRange}
                            onDateRangeChange={(dateRange) =>
                              updateBulkRequest(req.id, "dateRange", dateRange)
                            }
                            placeholder="Select start and end dates"
                            minDate={new Date()}
                            className="w-full"
                            defaultMonth={req.dateRange?.from || new Date()}
                          />
                        </div>

                        {/* Reason */}
                        <div className="space-y-1">
                          <Label className="text-xs">Reason</Label>
                          <Textarea
                            value={req.reason}
                            onChange={(e) => updateBulkRequest(req.id, "reason", e.target.value)}
                            placeholder="Enter reason for leave..."
                            rows={2}
                            className="text-sm"
                            required
                          />
                        </div>

                        {/* Days Preview */}
                        {req.dateRange?.from && req.dateRange?.to && (
                          <div className="text-xs text-muted-foreground">
                            {calculateWorkingDays(req.dateRange.from, req.dateRange.to)} working day
                            {calculateWorkingDays(req.dateRange.from, req.dateRange.to) !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Another Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBulkRequest}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Request
                  </Button>

                  {/* Summary */}
                  {bulkRequests.some((req) => req.dateRange?.from && req.dateRange?.to) && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Total Requests:</span>
                          <span className="font-medium text-foreground">
                            {bulkRequests.filter((req) => req.dateRange?.from && req.dateRange?.to).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Days:</span>
                          <span className="font-medium text-foreground">
                            {calculateBulkTotalDays()} days
                          </span>
                        </div>
                        {leaveBalance && (
                          <>
                            <div className="flex justify-between">
                              <span>Available {formData.type.toLowerCase()} leave:</span>
                              <span className="font-medium text-foreground">{remainingBalance} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Remaining after requests:</span>
                              <span
                                className={`font-medium ${
                                  remainingBalance - calculateBulkTotalDays() < 0
                                    ? "text-destructive"
                                    : "text-foreground"
                                }`}
                              >
                                {Math.max(0, remainingBalance - calculateBulkTotalDays())} days
                              </span>
                            </div>
                            {remainingBalance < calculateBulkTotalDays() && (
                              <div className="text-destructive text-xs mt-1">
                                ⚠️ Insufficient balance for some requests
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitBulkRequestMutation.isPending || isLoadingBalance}
                      className="flex-1"
                    >
                      {submitBulkRequestMutation.isPending
                        ? "Submitting..."
                        : `Submit ${bulkRequests.filter((req) => req.dateRange?.from && req.dateRange?.to).length} Request${bulkRequests.filter((req) => req.dateRange?.from && req.dateRange?.to).length !== 1 ? "s" : ""}`}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              {/* Leave Type Selection */}
              {availableLeaveTypes.length > 1 && (
                <div className="space-y-1">
                  <Label htmlFor="type" className="text-sm">Leave Type</Label>
                  <Select name="type" value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as "ANNUAL" | "TOIL" | "SICK" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeaveTypes.filter(type => type && type.trim()).map((type: string) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* TOIL Hours Input */}
              {formData.type === 'TOIL' && (
                <div className="space-y-1">
                  <Label htmlFor="hours" className="text-sm">TOIL Hours</Label>
                  <Input
                    type="number"
                    name="hours"
                    value={formData.hours}
                    onChange={handleInputChange}
                    min="1"
                    max="24"
                    placeholder="Enter hours (1-24)"
                    className="text-sm"
                  />
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-1">
                <Label className="text-sm">Leave Dates</Label>
                <DateRangePicker
                  dateRange={formData.dateRange}
                  onDateRangeChange={(dateRange) =>
                    setFormData(prev => ({ ...prev, dateRange }))
                  }
                  placeholder="Select start and end dates"
                  minDate={new Date()}
                  className="w-full"
                  defaultMonth={formData.dateRange?.from || new Date()}
                />
              </div>

              {/* Balance Display */}
              {leaveBalance && (
                <div className="bg-muted p-2 rounded-md">
                  <div className="text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Available {formData.type.toLowerCase()} leave:</span>
                      <span className="font-medium text-foreground">{remainingBalance} days</span>
                    </div>
                    {previewDays > 0 && (
                      <div className="flex justify-between mt-0.5">
                        <span>Requested:</span>
                        <span className="font-medium text-foreground">{previewDays} days</span>
                      </div>
                    )}
                    {previewDays > 0 && (
                      <div className="flex justify-between mt-0.5">
                        <span>Remaining:</span>
                        <span className={`font-medium ${(remainingBalance - previewDays) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {Math.max(0, remainingBalance - previewDays)} days
                        </span>
                      </div>
                    )}
                    {previewDays > 0 && remainingBalance < previewDays && (
                      <div className="text-destructive text-xs mt-0.5">
                        ⚠️ Insufficient balance
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inline Calendar */}
              <div className="space-y-1">
                <Label className="text-sm">Select Dates</Label>
                <div className="w-full">
                  <Calendar
                    mode="range"
                    defaultMonth={formData.dateRange?.from}
                    selected={formData.dateRange}
                    onSelect={(range) =>
                      setFormData(prev => ({ ...prev, dateRange: range }))
                    }
                    numberOfMonths={2}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    modifiers={calendarModifiers}
                    modifiersClassNames={calendarModifiersClassNames}
                    className="rounded-md border w-full"
                  />
                </div>
                {/* Legend for team calendar indicators */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Multiple</span>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-1">
                <Label htmlFor="comments" className="text-sm">Reason</Label>
                <Textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Please provide a reason for your leave request..."
                  required
                  className="text-sm"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoadingBalance}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LeaveRequestForm(props: LeaveRequestFormProps) {
  return (
    <ErrorBoundary errorTitle="Leave Request Form Error">
      <LeaveRequestFormInternal {...props} />
    </ErrorBoundary>
  );
}
