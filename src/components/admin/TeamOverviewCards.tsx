"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'AVAILABLE' | 'ON_LEAVE' | 'PENDING_LEAVE';
  currentLeave?: {
    type: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  leaveBalance: {
    annual: number;
    sick: number;
    toil: number;
  };
}

interface TeamOverviewCardsProps {
  teamMembers?: TeamMember[];
  loading?: boolean;
}

export default function TeamOverviewCards({ teamMembers = [], loading = false }: TeamOverviewCardsProps) {
  const router = useRouter();

  const displayMembers = teamMembers;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_LEAVE': return 'destructive';
      case 'PENDING_LEAVE': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ON_LEAVE': return 'On Leave';
      case 'PENDING_LEAVE': return 'Leave Pending';
      default: return 'Available';
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members Grid - Horizontal Layout for People Focus */}
      <div className="grid gap-4 md:grid-cols-2">
        {displayMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center space-x-4 p-6">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`/avatars/${member.name.toLowerCase().replace(' ', '-')}.jpg`} />
                <AvatarFallback className="text-sm">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{member.name}</h4>
                  <Badge variant={getStatusColor(member.status) as any}>
                    {getStatusText(member.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{member.role}</p>
                
                {member.currentLeave && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{member.currentLeave.type}</span>
                    {' until '}{member.currentLeave.endDate}
                    {member.currentLeave.daysRemaining > 0 && 
                      ` (${member.currentLeave.daysRemaining} days left)`
                    }
                  </div>
                )}
                
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <span>Annual: {member.leaveBalance.annual}d</span>
                  <span>Sick: {member.leaveBalance.sick}d</span>
                  {member.leaveBalance.toil > 0 && (
                    <span>TOIL: {member.leaveBalance.toil}h</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push(`/admin/employee/${member.id}`)}
                >
                  View Details
                </Button>
                {member.status === 'AVAILABLE' && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => window.open(`mailto:${member.email}`, '_blank')}
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Team Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Team Actions</CardTitle>
          <CardDescription>
            Quick actions for team management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/employee-balances")}>
              <Users className="mr-2 h-4 w-4" />
              All Balances
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/pending-requests")}>
              <Clock className="mr-2 h-4 w-4" />
              Pending Approvals
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/coverage")}>
              <Calendar className="mr-2 h-4 w-4" />
              Coverage Planning
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}