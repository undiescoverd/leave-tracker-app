"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import EnhancedLeaveRequestForm from "@/components/EnhancedLeaveRequestForm";
import MultiTypeBalanceDisplay from "@/components/MultiTypeBalanceDisplay";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 font-bold">
                TDH Agency Leave Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={async () => {
                  try {
                    await signOut({ 
                      callbackUrl: "/login",
                      redirect: true 
                    });
                  } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/login';
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Dashboard
            </h2>
            <MultiTypeBalanceDisplay />
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Submit New Request</h3>
              </div>
              <div className="p-6">
                <EnhancedLeaveRequestForm />
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
              </div>
              <div className="p-6">
                <div className="grid gap-3">
                  <button 
                    onClick={() => router.push("/leave/requests")}
                    className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    My Leave History
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    View Team Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Section */}
          {session.user?.role === "ADMIN" && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Admin Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <button 
                    onClick={() => router.push("/admin/pending-requests")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Pending Requests
                  </button>
                  <button 
                    onClick={() => router.push("/admin/toil")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Manage TOIL
                  </button>
                  <button 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    User Management
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
