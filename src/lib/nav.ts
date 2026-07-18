import type { AppRole } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Sparkles,
  CalendarDays,
  Users,
  BarChart3,
  User,
  Megaphone,
  FolderOpen,
  MessagesSquare,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: AppRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin"] },
  { label: "Classes", to: "/classes", icon: BookOpen, roles: ["student", "teacher", "admin"] },
  { label: "Assignments", to: "/assignments", icon: ClipboardList, roles: ["student", "teacher", "admin"] },
  { label: "Announcements", to: "/announcements", icon: Megaphone, roles: ["student", "teacher", "admin"] },
  { label: "Materials", to: "/materials", icon: FolderOpen, roles: ["student", "teacher", "admin"] },
  { label: "Discussions", to: "/discussions", icon: MessagesSquare, roles: ["student", "teacher", "admin"] },
  { label: "AI Tutor", to: "/tutor", icon: Sparkles, roles: ["student", "teacher", "admin"] },
  { label: "Study Planner", to: "/planner", icon: Target, roles: ["student", "teacher", "admin"] },
  { label: "Calendar", to: "/calendar", icon: CalendarDays, roles: ["student", "teacher", "admin"] },
  { label: "Students", to: "/students", icon: Users, roles: ["teacher", "admin"] },
  { label: "Analytics", to: "/analytics", icon: BarChart3, roles: ["teacher", "admin"] },
  { label: "Profile", to: "/profile", icon: User, roles: ["student", "teacher", "admin"] },
];

export function navForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};
