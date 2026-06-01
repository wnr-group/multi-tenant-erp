"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function CompletionScreen({
  schoolName,
  brandColor,
}: {
  schoolName: string;
  brandColor: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/admin/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{schoolName} is ready.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Taking you to the dashboard…</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full w-0 animate-[grow_2s_linear_forwards] rounded-full"
          style={{ backgroundColor: brandColor }}
        />
      </div>
    </div>
  );
}
