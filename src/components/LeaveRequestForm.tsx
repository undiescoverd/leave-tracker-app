"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<{
    totalAllowance: number;
    daysUsed: number;
    remaining: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    comments: "",
  });
  const { showSuccess, showError } = useToast();

  // Calculate leave days for preview
  const calculatePreviewDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) return 0;
    
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Fetch leave balance when form opens
  useEffect(() => {
    if (isOpen && !leaveBalance) {
      fetchLeaveBalance();
    }
  }, [isOpen]);

  const fetchLeaveBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const response = await fetch("/api/leave/balance");
      if (response.ok) {
        const data = await response.json();
        setLeaveBalance(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch leave balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Enhanced client-side validation
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      showError("Start date cannot be in the past");
      setIsSubmitting(false);
      return;
    }
    
    if (endDate < startDate) {
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

    try {
      const response = await fetch("/api/leave/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason: formData.comments,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const message = `Leave request submitted successfully! ${result.data.leaveDays} days requested. ${result.data.remainingBalance} days will remain.`;
        showSuccess(message);
        setFormData({ startDate: "", endDate: "", comments: "" });
        setIsOpen(false);
        setLeaveBalance(null); // Reset balance for next time
        onSuccess?.();
      } else {
        // Enhanced error handling
        if (result.error && result.error.message) {
          showError(`Error: ${result.error.message}`);
        } else if (result.error && result.error.details) {
          // Handle field-specific errors
          const fieldErrors = Object.values(result.error.details).flat();
          showError(`Validation errors: ${fieldErrors.join(', ')}`);
        } else if (result.error) {
          showError(`Error: ${result.error}`);
        } else {
          showError("Failed to submit leave request");
        }
      }
    } catch (error) {
      showError("Network error: Failed to submit leave request");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ startDate: "", endDate: "", comments: "" });
    setLeaveBalance(null);
  };

  const previewDays = calculatePreviewDays();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>Submit Leave Request</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>Submit Leave Request</DialogTitle>
          </DialogHeader>

          {/* Leave Balance Display */}
          {leaveBalance && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Annual Allowance:</span>
                    <span className="font-semibold">{leaveBalance.totalAllowance} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Used:</span>
                    <span className="font-semibold">{leaveBalance.daysUsed} days</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Remaining:</span>
                    <span className="font-semibold text-primary">{leaveBalance.remaining} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingBalance && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading leave balance...
                </div>
              </CardContent>
            </Card>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Preview Days */}
            {previewDays > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <span className="font-semibold">Preview:</span> {previewDays} working days requested
                    {leaveBalance && (
                      <span className="block text-xs mt-1 text-muted-foreground">
                        {previewDays <= leaveBalance.remaining 
                          ? `✅ You have sufficient leave balance`
                          : `⚠️ This exceeds your remaining balance of ${leaveBalance.remaining} days`
                        }
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                placeholder="Optional comments about your leave request..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || previewDays === 0}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
