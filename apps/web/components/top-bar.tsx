"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface TopBarProps {
  userName: string;
  userRole: string;
  brandColor?: string;
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  principal: "Principal",
  super_admin: "Platform Admin",
};

function formatSegment(segment: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(segment)) {
    return "Detail";
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TopBar({ userName, userRole, brandColor }: TopBarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = ROLE_LABELS[userRole] ?? userRole;
  const avatarBg = brandColor ?? "#4f46e5";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {segments.length === 0 ? (
          <span className="font-semibold text-gray-900">Dashboard</span>
        ) : (
          segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
              <span
                className={
                  i === segments.length - 1
                    ? "font-semibold text-gray-900"
                    : "text-gray-400"
                }
              >
                {formatSegment(seg)}
              </span>
            </span>
          ))
        )}
      </nav>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none text-gray-900">
            {userName}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{roleLabel}</p>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: avatarBg }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
