"use client";

import { useSession } from "next-auth/react";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <AuthenticatedLayout>
      {session && <DashboardContent session={session} />}
    </AuthenticatedLayout>
  );
}
