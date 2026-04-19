"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteTeacherFormProps {
  schoolId: string;
  onSuccess?: () => void;
}

export function InviteTeacherForm({ schoolId, onSuccess }: InviteTeacherFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email, fullName: name, schoolId, role: "teacher",
        extraInserts: [{ table: "teacher_profiles", data: { school_id: schoolId } }],
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Invite failed");
      setLoading(false);
      return;
    }

    setName(""); setEmail("");
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <Button type="submit" disabled={loading}>{loading ? "Inviting…" : "Invite Teacher"}</Button>
    </form>
  );
}
