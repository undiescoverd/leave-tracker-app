-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('ANNUAL', 'TOIL', 'SICK');

-- CreateEnum
CREATE TYPE "public"."ToilType" AS ENUM ('TRAVEL_LATE_RETURN', 'WEEKEND_TRAVEL', 'AGENT_PANEL_DAY', 'OVERTIME');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "annualLeaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "toilBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sickLeaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_requests" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "type" "public"."LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "hours" DOUBLE PRECISION,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."toil_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."ToilType" NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adjustmentReason" TEXT,
    "previousBalance" DOUBLE PRECISION,
    "newBalance" DOUBLE PRECISION,

    CONSTRAINT "toil_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "leave_requests_userId_status_idx" ON "public"."leave_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "public"."leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "leave_requests_status_createdAt_idx" ON "public"."leave_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "toil_entries_userId_date_idx" ON "public"."toil_entries"("userId", "date");

-- CreateIndex
CREATE INDEX "toil_entries_approved_createdAt_idx" ON "public"."toil_entries"("approved", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."toil_entries" ADD CONSTRAINT "toil_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
