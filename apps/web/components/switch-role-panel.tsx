"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  principal: "Principal",
  teacher: "Teacher",
};

const ROLE_PATHS: Record<string, string> = {
  school_admin: "/admin/dashboard",
  principal: "/principal/dashboard",
  teacher: "/teacher/dashboard",
};

export function SwitchRolePanel({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function switchTo(role: string) {
    setLoading(true);
    await fetch("/api/context-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    // Set cookie client-side with parent domain
    const host = window.location.hostname;
    const parentDomain = host.includes("lvh.me") ? ".lvh.me" : host.includes("balajierp.com") ? ".balajierp.com" : "";
    document.cookie = `acting_as=${role}; path=/; domain=${parentDomain}; max-age=${60 * 60 * 8}; samesite=lax`;
    window.location.href = ROLE_PATHS[role] ?? "/";
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium text-gray-700">View portal as:</p>
      <div className="flex gap-2">
        {roles.map((role) => (
          <Button key={role} variant="outline" onClick={() => switchTo(role)} disabled={loading}>
            {ROLE_LABELS[role] ?? role} View
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Your actions remain logged under your real identity.
      </p>
    </div>
  );
}
