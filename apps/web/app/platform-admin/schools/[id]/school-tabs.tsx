"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "import", label: "Bulk Import" },
] as const;

export function SchoolTabs({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => {
            const params = new URLSearchParams();
            if (tab.key !== "overview") params.set("tab", tab.key);
            const qs = params.toString();
            router.push(`/platform-admin/schools/${schoolId}${qs ? `?${qs}` : ""}`);
          }}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
            activeTab === tab.key
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
