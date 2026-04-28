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

  function viewAs(role: string) {
    if (!schoolDomain) return;
    setLoading(true);
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
        <DropdownMenuItem onClick={() => viewAs("school_admin")}>
          School Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => viewAs("principal")}>
          Principal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => viewAs("teacher")}>
          Teacher
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
