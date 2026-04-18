"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateAnnouncementForm({ schoolId, createdBy }: { schoolId: string; createdBy: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("announcements").insert({
      school_id: schoolId, title, content, target_type: "school", created_by: createdBy,
    });
    setTitle(""); setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div>
        <Label>Content</Label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Posting…" : "Post Announcement"}</Button>
    </form>
  );
}
