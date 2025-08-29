"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminActions = memo(function AdminActions() {
  const router = useRouter();

  const navigateToAdmin = useCallback(() => router.push("/admin"), [router]);
  const navigateToPending = useCallback(() => router.push("/admin/pending-requests"), [router]);
  const navigateToToil = useCallback(() => router.push("/admin/toil"), [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
        <CardDescription>
          Manage leave requests and system administration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-4">
          <Button 
            variant="default"
            onClick={navigateToAdmin}
          >
            Admin Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={navigateToPending}
          >
            Pending Requests
          </Button>
          <Button 
            variant="outline"
            onClick={navigateToToil}
          >
            Manage TOIL
          </Button>
          <Button 
            variant="outline"
            disabled
          >
            User Management
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default AdminActions;