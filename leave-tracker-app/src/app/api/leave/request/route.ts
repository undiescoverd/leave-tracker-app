import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Validation schema for leave request
const leaveRequestSchema = z.object({
  startDate: z.string().datetime("Start date must be a valid date"),
  endDate: z.string().datetime("End date must be a valid date"),
  comments: z.string().optional(),
});

// UK agent conflict detection
async function checkUKAgentConflicts(startDate: Date, endDate: Date, currentUserId: string) {
  // Get all UK agents (users with role USER)
  const ukAgents = await prisma.user.findMany({
    where: {
      role: 'USER',
      id: { not: currentUserId } // Exclude current user
    },
    include: {
      leaveRequests: {
        where: {
          status: { in: ['PENDING', 'APPROVED'] }
        }
      }
    }
  });

  const conflicts: Array<{ agent: string, dates: string }> = [];

  for (const agent of ukAgents) {
    for (const request of agent.leaveRequests) {
      // Check if date ranges overlap
      if (
        (startDate <= request.endDate && endDate >= request.startDate) ||
        (request.startDate <= endDate && request.endDate >= startDate)
      ) {
        conflicts.push({
          agent: agent.name || agent.email,
          dates: `${request.startDate.toISOString().split('T')[0]} to ${request.endDate.toISOString().split('T')[0]}`
        });
      }
    }
  }

  return conflicts;
}

// Calculate working days (excluding weekends)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, comments } = leaveRequestSchema.parse(body);

    // Convert string dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Basic validation
    if (start >= end) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: "Cannot create leave requests for past dates" },
        { status: 400 }
      );
    }

    // Get user ID from session/auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Check for UK agent conflicts
    const conflicts = await checkUKAgentConflicts(start, end, userId);
    
    // Calculate working days
    const workingDays = calculateWorkingDays(start, end);

    // Create the leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        startDate: start,
        endDate: end,
        comments: comments || null,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log("🎉 Leave request created:", leaveRequest);

    return NextResponse.json(
      {
        message: "Leave request created successfully!",
        leaveRequest,
        workingDays,
        conflicts: conflicts.length > 0 ? conflicts : null,
        conflictWarning: conflicts.length > 0 
          ? `⚠️ Warning: ${conflicts.length} UK agent(s) have overlapping leave requests` 
          : null
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Leave request creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list leave requests
export async function GET() {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      message: "Leave requests retrieved successfully!",
      leaveRequests,
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
