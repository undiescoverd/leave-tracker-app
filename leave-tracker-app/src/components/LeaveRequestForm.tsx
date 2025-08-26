"use client";

import { useState, useEffect } from "react";
import { useToast, ToastContainer } from "./Toast";

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
  const { toasts, showSuccess, showError, removeToast } = useToast();

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
        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
      >
        Submit Leave Request
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Submit Leave Request</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Leave Balance Display */}
            {leaveBalance && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Annual Allowance:</span>
                    <span className="font-semibold">{leaveBalance.totalAllowance} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Used:</span>
                    <span className="font-semibold">{leaveBalance.daysUsed} days</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span>Remaining:</span>
                    <span className="font-semibold text-blue-600">{leaveBalance.remaining} days</span>
                  </div>
                </div>
              </div>
            )}

            {isLoadingBalance && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-sm text-gray-600">Loading leave balance...</div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 bg-white"
                />
              </div>

              {/* Preview Days */}
              {previewDays > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm text-green-800">
                    <span className="font-semibold">Preview:</span> {previewDays} working days requested
                    {leaveBalance && (
                      <span className="block text-xs mt-1">
                        {previewDays <= leaveBalance.remaining 
                          ? `✅ You have sufficient leave balance`
                          : `⚠️ This exceeds your remaining balance of ${leaveBalance.remaining} days`
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 bg-white"
                  placeholder="Optional comments about your leave request..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || previewDays === 0}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Request"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
