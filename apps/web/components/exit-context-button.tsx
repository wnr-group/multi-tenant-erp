"use client";

import { Button } from "@/components/ui/button";

export function ExitContextButton() {
  async function exit() {
    await fetch("/api/context-exit", { method: "POST" });
    window.location.href = "/platform-admin/dashboard";
  }

  return (
    <Button size="sm" variant="outline" onClick={exit} className="border-amber-700 text-amber-900 hover:bg-amber-500">
      Exit View
    </Button>
  );
}
