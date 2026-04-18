"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  schoolId,
  isActive,
}: {
  schoolId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("schools")
      .update({ is_active: !isActive })
      .eq("id", schoolId);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "Updating…" : isActive ? "Deactivate School" : "Activate School"}
    </Button>
  );
}
