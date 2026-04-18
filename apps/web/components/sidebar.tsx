"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, School, GraduationCap, Users, BookOpen,
  Calendar, ClipboardList, DollarSign, Megaphone, Settings,
  Clock, FileText, AlertTriangle, MessageSquare, UserCheck,
  Building2, BarChart3, Shield, Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Schools: Building2,
  Classes: School,
  Subjects: BookOpen,
  Teachers: Users,
  Students: GraduationCap,
  Timetable: Clock,
  Academics: Calendar,
  Syllabus: Upload,
  Fees: DollarSign,
  Announcements: Megaphone,
  Settings: Settings,
  Reports: BarChart3,
  Discipline: Shield,
  Attendance: UserCheck,
  Homework: ClipboardList,
  Results: FileText,
  Feedback: MessageSquare,
};

interface NavItem {
  label: string;
  href: string;
}

interface SidebarProps {
  title: string;
  items: NavItem[];
}

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-indigo-950 text-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <GraduationCap className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-indigo-100">
          {title}
        </span>
      </div>
      <div className="mx-4 border-t border-indigo-800/60" />
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICON_MAP[item.label] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-indigo-300 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
