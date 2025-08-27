"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  comments?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PendingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchLeaveRequests();
    }
  }, [session]);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch("/api/leave/request");
      const data = await response.json();
      
      if (response.ok) {
        setLeaveRequests(data.data?.leaveRequests || data.leaveRequests || []);
      } else {
        console.error("Failed to fetch leave requests:", data.error);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const response = await fetch(`/api/leave/request/${requestId}/approve`, {
        method: "POST",
      });
      
      if (response.ok) {
        showSuccess("Leave request approved successfully!");
        fetchLeaveRequests(); // Refresh the list
      } else {
        const error = await response.json();
        showError(`Failed to approve: ${error.error}`);
      }
    } catch (error) {
      showError("Error approving request");
      console.error("Error:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectComment.trim()) {
      showError("Please provide a reason for rejection");
      return;
    }

    setProcessing(requestId);
    try {
      const response = await fetch(`/api/leave/request/${requestId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminComment: rejectComment.trim()
        }),
      });
      
      if (response.ok) {
        showSuccess("Leave request rejected successfully!");
        fetchLeaveRequests(); // Refresh the list
        setRejectComment(""); // Clear comment
        setShowRejectModal(null); // Close modal
      } else {
        const error = await response.json();
        showError(`Failed to reject: ${error.error?.message || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      showError("Error rejecting request");
      console.error("Error:", error);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Ensure leaveRequests is always an array
  const requests = leaveRequests || [];
  const pendingRequests = requests.filter(req => req.status === 'PENDING');
  const otherRequests = requests.filter(req => req.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                TDH Agency Leave Tracker - Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Pending Requests Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Requests ({pendingRequests.length})
              </h2>
              
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500">No pending requests to review.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.user.name}
                          </h3>
                          <p className="text-sm text-gray-600">{request.user.email}</p>
                                                     <div className="mt-2 space-y-1">
                             <p className="text-sm text-gray-900">
                               <span className="font-semibold">Dates:</span> {formatDate(request.startDate)} - {formatDate(request.endDate)}
                             </p>
                             {request.comments && (
                               <p className="text-sm text-gray-900">
                                 <span className="font-semibold">Comments:</span> {request.comments}
                               </p>
                             )}
                             <p className="text-sm text-gray-600">
                               Submitted: {formatDate(request.createdAt)}
                             </p>
                           </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processing === request.id}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            {processing === request.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => setShowRejectModal(request.id)}
                            disabled={processing === request.id}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            {processing === request.id ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Other Requests Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                All Requests ({leaveRequests.length})
              </h2>
              
              {leaveRequests.length === 0 ? (
                <p className="text-gray-500">No leave requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaveRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {request.user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Reject Leave Request</h2>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectComment("");
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                placeholder="Please provide a reason for rejecting this leave request..."
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectComment.trim() || processing === showRejectModal}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {processing === showRejectModal ? "Processing..." : "Reject Request"}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectComment("");
                }}
                disabled={processing === showRejectModal}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
