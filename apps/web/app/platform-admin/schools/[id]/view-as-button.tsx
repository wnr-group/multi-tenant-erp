"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ViewAsButton({ schoolDomain }: { schoolDomain: string }) {
  const [loading, setLoading] = useState(false);

  async function switchContext(role: string) {
    if (!schoolDomain) return;
    setLoading(true);
    // Call API to log the audit entry
    await fetch("/api/context-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    // Set cookie client-side with parent domain so it's shared across subdomains
    const host = window.location.hostname;
    const parentDomain = host.includes("lvh.me") ? ".lvh.me" : host.includes("balajierp.com") ? ".balajierp.com" : "";
    document.cookie = `acting_as=${role}; path=/; domain=${parentDomain}; max-age=${60 * 60 * 8}; samesite=lax`;
    const port = window.location.port ? `:${window.location.port}` : "";
    const path = role === "school_admin" ? "admin" : role;
    window.location.href = `http://${schoolDomain}${port}/${path}/dashboard`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading || !schoolDomain}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        View as…
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => switchContext("school_admin")}>
          School Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchContext("principal")}>
          Principal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchContext("teacher")}>
          Teacher
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
