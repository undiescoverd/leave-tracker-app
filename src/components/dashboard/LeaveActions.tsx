"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo } from "react";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LeaveActions = memo(function LeaveActions() {
  const router = useRouter();
  
  const navigateToHistory = useCallback(() => router.push("/leave/requests"), [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Actions</CardTitle>
        <CardDescription>
          Submit new requests and view your leave history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <LeaveRequestForm />
          <Button 
            onClick={navigateToHistory}
            className="flex-1"
          >
            My Leave History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default LeaveActions;