"use client";

import { useState, useEffect } from "react";
import { useToast, ToastContainer } from "./Toast";
import { features } from "@/lib/features";

interface LeaveRequestFormProps {
  onSuccess?: () => void;
}

interface LeaveBalance {
  totalAllowance: number;
  daysUsed: number;
  remaining: number;
  balances?: {
    annual: { total: number; used: number; remaining: number };
    toil?: { total: number; used: number; remaining: number };
    sick?: { total: number; used: number; remaining: number };
  };
}

export default function EnhancedLeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    comments: "",
    type: "ANNUAL" as "ANNUAL" | "TOIL" | "SICK",
    hours: "" as string | number,
  });
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Get available leave types based on feature flags
  const availableLeaveTypes = features.getAvailableLeaveTypes();

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
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
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
          startDate: "",
          endDate: "",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
      >
        Request Leave
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Request Leave
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Selection */}
              {availableLeaveTypes.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableLeaveTypes.map((type: string) => (
                      <option key={type} value={type}>
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TOIL Hours Input */}
              {formData.type === 'TOIL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TOIL Hours
                  </label>
                  <input
                    type="number"
                    name="hours"
                    value={formData.hours}
                    onChange={handleInputChange}
                    min="1"
                    max="24"
                    placeholder="Enter hours (1-24)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Balance Display */}
              {leaveBalance && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Available {formData.type.toLowerCase()} leave:</span>
                      <span className="font-medium">{remainingBalance} days</span>
                    </div>
                    {previewDays > 0 && (
                      <div className="flex justify-between mt-1">
                        <span>Requested:</span>
                        <span className="font-medium">{previewDays} days</span>
                      </div>
                    )}
                    {previewDays > 0 && remainingBalance < previewDays && (
                      <div className="text-red-600 text-xs mt-1">
                        ⚠️ Insufficient balance
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Please provide a reason for your leave request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingBalance}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
