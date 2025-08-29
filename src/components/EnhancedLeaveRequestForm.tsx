"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { features } from "@/lib/features";
import { calculateWorkingDays } from "@/lib/date-utils";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export default function EnhancedLeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { balance: leaveBalance, loading: isLoadingBalance, error: balanceError, refetch: refetchBalance } = useLeaveBalance();
  const [formData, setFormData] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    comments: "",
    type: "ANNUAL" as "ANNUAL" | "TOIL" | "SICK",
    hours: "" as string | number,
  });
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

  // Get available leave types based on feature flags
  const availableLeaveTypes = features.getAvailableLeaveTypes();

  // Calculate leave days for preview
  const calculatePreviewDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    if (formData.endDate < formData.startDate) return 0;
    
    return calculateWorkingDays(formData.startDate, formData.endDate);
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
    setIsSubmitting(true);

    // Enhanced client-side validation
    if (!formData.startDate || !formData.endDate) {
      showError("Please select both start and end dates");
      setIsSubmitting(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (formData.startDate < today) {
      showError("Start date cannot be in the past");
      setIsSubmitting(false);
      return;
    }
    
    if (formData.endDate < formData.startDate) {
      showError("End date must be after or equal to start date");
      setIsSubmitting(false);
      return;
    }

    const previewDays = calculatePreviewDays();
    if (previewDays === 0) {
      showError("Please select valid dates for your leave request");
      setIsSubmitting(false);
      return;
    }

    // Validate TOIL hours if applicable
    if (formData.type === 'TOIL' && formData.hours) {
      const hours = Number(formData.hours);
      if (hours <= 0 || hours > 24) {
        showError("TOIL hours must be between 1 and 24");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const requestData = {
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        reason: formData.comments,
        type: formData.type,
        ...(formData.type === 'TOIL' && formData.hours && { hours: Number(formData.hours) })
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
        showSuccess(result.data.message || `${formData.type} leave request submitted successfully!`);
        setFormData({
          startDate: undefined,
          endDate: undefined,
          comments: "",
          type: "ANNUAL",
          hours: "",
        });
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        showError(result.error || "Failed to submit leave request");
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showError("An error occurred while submitting your request");
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
                    {availableLeaveTypes.map((type: string) => (
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
              <Label>Start Date</Label>
              <DatePicker
                date={formData.startDate}
                onDateChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                placeholder="Select start date"
                minDate={new Date()}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                date={formData.endDate}
                onDateChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                placeholder="Select end date"
                minDate={formData.startDate || new Date()}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
