"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">TOIL Management</h1>
              <p className="text-muted-foreground">Manage Time Off In Lieu balances and approvals</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin">
                Back to Admin
              </Link>
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Card className={`mb-6 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
            <CardContent className="pt-6">
              <p className={message.type === 'success' ? 'text-green-700' : 'text-destructive'}>
                {message.text}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'adjust' | 'pending' | 'history')} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="adjust">Adjust TOIL Balance</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval ({pendingEntries.length})</TabsTrigger>
            <TabsTrigger value="history">TOIL History</TabsTrigger>
          </TabsList>

          <TabsContent value="adjust">
            <Card>
              <CardHeader>
                <CardTitle>Add TOIL Hours</CardTitle>
                <CardDescription>Add Time Off In Lieu hours for employees</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Select Employee</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email} - Current TOIL: {user.toilBalance || 0} hours
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">TOIL Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OVERTIME">General Overtime</SelectItem>
                          <SelectItem value="TRAVEL_LATE_RETURN">Late Travel Return</SelectItem>
                          <SelectItem value="WEEKEND_TRAVEL">Weekend Travel</SelectItem>
                          <SelectItem value="AGENT_PANEL_DAY">Agent Panel Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.hours}
                        onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                        placeholder="e.g., 4"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      placeholder="e.g., Weekend travel to Edinburgh show"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Processing...' : 'Add TOIL Hours'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending TOIL Requests</CardTitle>
                <CardDescription>Review and approve pending Time Off In Lieu requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingEntries.length === 0 ? (
                  <p className="text-muted-foreground">No pending TOIL entries</p>
                ) : (
                  <div className="space-y-4">
                    {pendingEntries.map((entry) => (
                      <Card key={entry.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium">{entry.user.name || entry.user.email}</p>
                              <Badge variant="outline">{entry.type.replace(/_/g, ' ')}</Badge>
                              <p className="text-sm text-foreground">{entry.hours} hours - {entry.reason}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(entry.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt('Rejection reason (optional):');
                                  handleReject(entry.id, reason || undefined);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>TOIL History</CardTitle>
                <CardDescription>Complete history of approved Time Off In Lieu entries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.user.name || entry.user.email}</TableCell>
                        <TableCell>{entry.type.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{entry.hours}</TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            Approved
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
