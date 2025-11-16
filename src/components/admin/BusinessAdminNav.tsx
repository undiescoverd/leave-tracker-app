"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  FileCheck, 
  Clock, 
  Shield,
  Settings,
  BarChart3,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface BusinessAdminNavProps {
  pendingCount?: number;
  toilHours?: number;
}

export default function BusinessAdminNav({ pendingCount = 0, toilHours = 0 }: BusinessAdminNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  interface NavigationItem {
    name: string;
    path: string;
    icon: any;
    description: string;
    badge?: string | number;
    badgeVariant?: string;
    disabled?: boolean;
    comingSoon?: boolean;
  }

  const navigationSections: { title: string; items: NavigationItem[] }[] = [
    {
      title: "Team Management",
      items: [
        {
          name: "Team Overview",
          path: "/admin/team",
          icon: Users,
          description: "View all team members and their current status"
        },
        {
          name: "Employee Balances",
          path: "/admin/employee-balances", 
          icon: UserCheck,
          description: "Check leave balances for all employees"
        },
        {
          name: "Coverage Planning",
          path: "/admin/coverage",
          icon: Calendar,
          description: "Plan team coverage and manage absences"
        }
      ]
    },
    {
      title: "Approvals & Requests",
      items: [
        {
          name: "Pending Requests",
          path: "/admin/pending-requests",
          icon: AlertCircle,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeVariant: "destructive",
          description: "Review and approve pending leave requests"
        },
        {
          name: "TOIL Management", 
          path: "/admin/toil",
          icon: Clock,
          badge: toilHours > 0 ? `${toilHours}h` : undefined,
          badgeVariant: "secondary",
          description: "Manage Time Off In Lieu hours and approvals"
        }
      ]
    },
    {
      title: "Business Intelligence",
      items: [
        {
          name: "Reports & Analytics",
          path: "/admin/reports",
          icon: TrendingUp,
          description: "View leave utilization trends and patterns"
        },
        {
          name: "Business Metrics",
          path: "/admin/metrics",
          icon: BarChart3,
          description: "Track team productivity and leave impact"
        }
      ]
    },
    {
      title: "Administration",
      items: [
        {
          name: "Leave Policies",
          path: "/admin/policies",
          icon: FileCheck,
          description: "Review and update company leave policies",
          disabled: true,
          comingSoon: true
        },
        {
          name: "System Settings",
          path: "/admin/settings",
          icon: Settings,
          description: "Configure system preferences and notifications",
          disabled: true,
          comingSoon: true
        }
      ]
    }
  ];

  return (
    <nav className="w-64 bg-background border-r h-full p-4 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Business Admin</h3>
        <p className="text-xs text-muted-foreground">Team & Leave Management</p>
      </div>

      <div className="space-y-6">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title} className="space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">{section.title}</h4>
              <Separator />
            </div>
            
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => !item.disabled && router.push(item.path)}
                    disabled={item.disabled}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {item.name}
                          </span>
                          {item.badge && (
                            <Badge 
                              variant={item.badgeVariant as any} 
                              className="text-xs ml-2"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {item.comingSoon && (
                            <Badge variant="outline" className="text-xs ml-2">
                              Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground text-left mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-8 p-3 bg-muted rounded-lg">
        <h5 className="text-xs font-medium text-foreground mb-2">Quick Stats</h5>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Pending Reviews:</span>
            <Badge variant="secondary" className="text-xs">{pendingCount}</Badge>
          </div>
          <div className="flex justify-between">
            <span>TOIL Hours:</span>
            <Badge variant="outline" className="text-xs">{toilHours}h</Badge>
          </div>
        </div>
      </div>
    </nav>
  );
}