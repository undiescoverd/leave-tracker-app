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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 font-bold">
                TDH Agency Leave Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
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
                    // Fallback redirect
                    window.location.href = '/login';
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 font-bold">
                Dashboard
              </h2>
              
              {/* Multi-Type Balance Display */}
              <div className="mb-8">
                <MultiTypeBalanceDisplay />
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-bold">
                  Quick Actions
                </h3>
                <div className="flex space-x-4">
                  <EnhancedLeaveRequestForm />
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    View Team Calendar
                  </button>
                  <button 
                    onClick={() => router.push("/leave/requests")}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    My Leave History
                  </button>
                </div>
              </div>

              {session.user?.role === "ADMIN" && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 font-bold">
                    Admin Actions
                  </h3>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => router.push("/admin/pending-requests")}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Pending Requests
                    </button>
                    <button 
                      onClick={() => router.push("/admin/toil")}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Manage TOIL
                    </button>
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                      User Management
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
