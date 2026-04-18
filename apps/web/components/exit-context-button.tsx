"use client";

import { Button } from "@/components/ui/button";

export function ExitContextButton() {
  async function exit() {
    await fetch("/api/context-exit", { method: "POST" });
    // Redirect back to admin domain
    const host = window.location.host;
    const port = window.location.port ? `:${window.location.port}` : "";
    const isLvh = host.includes("lvh.me");
    const adminUrl = isLvh
      ? `http://core.lvh.me${port}/platform-admin/dashboard`
      : `https://admin.balajierp.com/platform-admin/dashboard`;
    window.location.href = adminUrl;
  }

  return (
    <Button size="sm" variant="outline" onClick={exit} className="border-amber-700 text-amber-900 hover:bg-amber-500">
      Exit View
    </Button>
  );
}
