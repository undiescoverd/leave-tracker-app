"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { features } from "@/lib/features";
import { calculateWorkingDays } from "@/lib/date-utils";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { useSubmitLeaveRequest } from "@/hooks/useLeaveRequests";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TOILForm } from "@/components/leave/toil/TOILForm";
import ErrorBoundary from "@/components/ErrorBoundary";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

function LeaveRequestFormInternal({ onSuccess }: LeaveRequestFormProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { data: leaveBalance, isLoading: isLoadingBalance, error: balanceError } = useLeaveBalance(session?.user?.id || '');
  const submitRequestMutation = useSubmitLeaveRequest();
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'TOIL' | 'SICK'>('ANNUAL');
  const [formData, setFormData] = useState({
    dateRange: undefined as DateRange | undefined,
    comments: "",
    type: "ANNUAL" as "ANNUAL" | "TOIL" | "SICK",
    hours: "" as string | number,
  });
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

  // Get available leave types based on feature flags
  const availableLeaveTypes = features.getAvailableLeaveTypes();

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
    
    if (features.isMultiLeaveTypeEnabled() && leaveBalance.balances) {
      switch (formData.type) {
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

    // Validate TOIL hours if applicable
    if (formData.type === 'TOIL' && formData.hours) {
      const hours = Number(formData.hours);
      if (hours <= 0 || hours > 24) {
        showError("TOIL hours must be between 1 and 24");
        return;
      }
    }

    const requestData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      comments: formData.comments,
      type: formData.type,
      ...(formData.type === 'TOIL' && formData.hours && { hours: Number(formData.hours) })
    };

    try {
      await submitRequestMutation.mutateAsync(requestData);
      showSuccess(`${formData.type} leave request submitted successfully!`);
      setFormData({
        dateRange: undefined,
        comments: "",
        type: "ANNUAL",
        hours: "",
      });
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showError(error instanceof Error ? error.message : "An error occurred while submitting your request");
    }
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>

{features.TOIL_REQUEST_ENABLED ? (
            <Tabs value={leaveType} onValueChange={(value) => setLeaveType(value as 'ANNUAL' | 'TOIL')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ANNUAL">Annual Leave</TabsTrigger>
                <TabsTrigger value="TOIL">TOIL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ANNUAL">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>Leave Dates</Label>
                    <DateRangePicker
                      dateRange={formData.dateRange}
                      onDateRangeChange={(dateRange) => 
                        setFormData(prev => ({ ...prev, dateRange }))
                      }
                      placeholder="Select start and end dates"
                      minDate={new Date()}
                      className="w-full"
                    />
                  </div>

                  {/* Balance Display */}
                  {leaveBalance && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Available annual leave:</span>
                          <span className="font-medium text-foreground">{remainingBalance} days</span>
                        </div>
                        {previewDays > 0 && (
                          <div className="flex justify-between mt-1">
                            <span>Requested:</span>
                            <span className="font-medium text-foreground">{previewDays} days</span>
                          </div>
                        )}
                        {previewDays > 0 && remainingBalance < previewDays && (
                          <div className="text-destructive text-xs mt-1">
                            ⚠️ Insufficient balance
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="space-y-2">
                    <Label htmlFor="comments">Reason</Label>
                    <Textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Please provide a reason for your leave request..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
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
              
              <TabsContent value="TOIL">
                <TOILForm
                  onSubmit={handleTOILSubmit}
                  onCancel={() => setIsOpen(false)}
                  availableUsers={availableUsers}
                  loading={loadingUsers}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Selection */}
              {availableLeaveTypes.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="type">Leave Type</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="hours">TOIL Hours</Label>
                  <Input
                    type="number"
                    name="hours"
                    value={formData.hours}
                    onChange={handleInputChange}
                    min="1"
                    max="24"
                    placeholder="Enter hours (1-24)"
                  />
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Leave Dates</Label>
                <DateRangePicker
                  dateRange={formData.dateRange}
                  onDateRangeChange={(dateRange) => 
                    setFormData(prev => ({ ...prev, dateRange }))
                  }
                  placeholder="Select start and end dates"
                  minDate={new Date()}
                  className="w-full"
                />
              </div>

              {/* Balance Display */}
              {leaveBalance && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Available {formData.type.toLowerCase()} leave:</span>
                      <span className="font-medium text-foreground">{remainingBalance} days</span>
                    </div>
                    {previewDays > 0 && (
                      <div className="flex justify-between mt-1">
                        <span>Requested:</span>
                        <span className="font-medium text-foreground">{previewDays} days</span>
                      </div>
                    )}
                    {previewDays > 0 && remainingBalance < previewDays && (
                      <div className="text-destructive text-xs mt-1">
                        ⚠️ Insufficient balance
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments">Reason</Label>
                <Textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Please provide a reason for your leave request..."
                  required
                />
              </div>

              <DialogFooter className="pt-4">
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
