"use client";

import { Button } from "@/components/ui/button";

export function ExitContextButton() {
  async function exit() {
    await fetch("/api/context-exit", { method: "POST" });
    // Clear cookie client-side with parent domain
    const host = window.location.hostname;
    const parentDomain = host.includes("lvh.me") ? ".lvh.me" : host.includes("balajierp.com") ? ".balajierp.com" : "";
    document.cookie = `acting_as=; path=/; domain=${parentDomain}; max-age=0`;
    // Redirect back to admin domain
    const port = window.location.port ? `:${window.location.port}` : "";
    const adminUrl = host.includes("lvh.me")
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
