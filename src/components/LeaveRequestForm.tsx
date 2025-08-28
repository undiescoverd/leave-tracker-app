"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

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
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        Submit Leave Request
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Submit Leave Request</h2>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Leave Balance Display */}
              {leaveBalance && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
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
                      <span className="font-semibold text-blue-600">{leaveBalance.remaining} days</span>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingBalance && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="text-sm text-gray-600 flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Loading leave balance...
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label htmlFor="startDate" className="form-label">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    className="form-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate" className="form-label">End Date</label>
                  <input
                    id="endDate"
                    type="date"
                    required
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Preview Days */}
                {previewDays > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm">
                      <span className="font-semibold">Preview:</span> {previewDays} working days requested
                      {leaveBalance && (
                        <span className="block text-xs mt-1 text-gray-600">
                          {previewDays <= leaveBalance.remaining 
                            ? `✅ You have sufficient leave balance`
                            : `⚠️ This exceeds your remaining balance of ${leaveBalance.remaining} days`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="comments" className="form-label">Comments</label>
                  <textarea
                    id="comments"
                    className="form-input"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={3}
                    placeholder="Optional comments about your leave request..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || previewDays === 0}
                    className="btn-primary flex-1 flex justify-center items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
