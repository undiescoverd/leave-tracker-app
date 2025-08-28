"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  days: number;
  createdAt: string;
  adminComment?: string;
}

export default function LeaveRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Ensure requests is always an array
  const safeRequests = Array.isArray(requests) ? requests : [];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRequests();
    }
  }, [status, router, currentPage, pageSize, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await fetch(`/api/leave/requests?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        // Ensure we have an array, even if the API returns unexpected data
        const requestsArray = Array.isArray(data.data?.requests) 
          ? data.data.requests 
          : Array.isArray(data.data) 
            ? data.data 
            : [];
            
        setRequests(requestsArray);
        setTotalPages(data.data?.totalPages || 1);
        setTotalCount(data.data?.total || 0);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to fetch requests");
        setRequests([]); // Set empty array on error
      }
    } catch (err) {
      setError("Network error: Unable to fetch leave requests");
      console.error("Error fetching requests:", err);
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Leave History</h1>
              <p className="mt-2 text-gray-600">View and track all your leave requests</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filter and Pagination Controls */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="ALL">All Requests</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Show:</label>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-white border border-red-200 rounded-lg shadow-sm mb-6">
            <div className="p-6">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading requests...</p>
              </div>
            ) : safeRequests.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No leave requests found</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Submit New Request
                </button>
              </div>
            ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block sm:hidden p-4 space-y-3">
                {safeRequests.map((request) => (
                  <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                        <p className="text-xs text-gray-500">{request.days} days</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {request.reason || 'No reason provided'}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDate(request.createdAt)}
                    </p>
                    
                    {request.adminComment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Admin Comment:</strong> {request.adminComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {safeRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{request.reason || 'No reason provided'}</div>
                          {request.adminComment && (
                            <div className="text-xs text-gray-500 mt-1">
                              Admin: {request.adminComment}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
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
            </>
          )}
          </div>
        </div>
        
        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 border rounded-md text-sm min-w-[2rem] ${
                          currentPage === pageNum 
                            ? 'bg-teal-500 text-white border-teal-500' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
