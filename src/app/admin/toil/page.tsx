"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  toilBalance?: number;
}

interface ToilEntry {
  id: string;
  userId: string;
  date: string;
  type: string;
  hours: number;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminToilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [toilEntries, setToilEntries] = useState<ToilEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'adjust' | 'pending' | 'history'>('adjust');
  const [formData, setFormData] = useState({
    hours: '',
    reason: '',
    type: 'OVERTIME' as 'OVERTIME' | 'TRAVEL_LATE_RETURN' | 'WEEKEND_TRAVEL' | 'AGENT_PANEL_DAY',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchUsers();
    fetchToilEntries();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchToilEntries = async () => {
    try {
      const response = await fetch('/api/admin/toil');
      if (response.ok) {
        const data = await response.json();
        setToilEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch TOIL entries:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formData.hours || !formData.reason) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/toil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          hours: parseFloat(formData.hours),
          reason: formData.reason,
          type: formData.type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'TOIL balance updated successfully!' });
        setFormData({ hours: '', reason: '', type: 'OVERTIME' });
        setSelectedUser('');
        fetchUsers(); // Refresh user balances
        fetchToilEntries(); // Refresh entries
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update TOIL balance' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      const response = await fetch('/api/admin/toil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toilEntryId: entryId,
          action: 'approve',
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'TOIL entry approved!' });
        fetchToilEntries();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve entry' });
    }
  };

  const handleReject = async (entryId: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/toil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toilEntryId: entryId,
          action: 'reject',
          reason,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'TOIL entry rejected' });
        fetchToilEntries();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reject entry' });
    }
  };

  const pendingEntries = toilEntries.filter(e => !e.approved);
  const approvedEntries = toilEntries.filter(e => e.approved);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">TOIL Management</h1>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('adjust')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'adjust'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Adjust TOIL Balance
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Approval ({pendingEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              TOIL History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'adjust' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add TOIL Hours</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose an employee...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} - Current TOIL: {user.toilBalance || 0} hours
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TOIL Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OVERTIME">General Overtime</option>
                    <option value="TRAVEL_LATE_RETURN">Late Travel Return</option>
                    <option value="WEEKEND_TRAVEL">Weekend Travel</option>
                    <option value="AGENT_PANEL_DAY">Agent Panel Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 4"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="e.g., Weekend travel to Edinburgh show"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  isSubmitting
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Add TOIL Hours'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Pending TOIL Requests</h2>
            {pendingEntries.length === 0 ? (
              <p className="text-gray-500">No pending TOIL entries</p>
            ) : (
              <div className="space-y-4">
                {pendingEntries.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{entry.user.name || entry.user.email}</p>
                        <p className="text-sm text-gray-600">{entry.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm">{entry.hours} hours - {entry.reason}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(entry.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason (optional):');
                            handleReject(entry.id, reason || undefined);
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">TOIL History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-sm">{entry.user.name || entry.user.email}</td>
                      <td className="px-4 py-3 text-sm">{entry.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm">{entry.hours}</td>
                      <td className="px-4 py-3 text-sm">{entry.reason}</td>
                      <td className="px-4 py-3 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Approved
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
