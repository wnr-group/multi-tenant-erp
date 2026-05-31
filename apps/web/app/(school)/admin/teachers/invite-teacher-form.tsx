"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: `+91${phone}`,
        fullName: name,
        schoolId,
        role: "teacher",
        extraInserts: [{ table: "teacher_profiles", data: { school_id: schoolId } }],
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to add teacher");
      toast.error(msg ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setName("");
    setPhone("");
    setLoading(false);
    toast.success("Teacher added successfully.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <div>
        <Label>Full Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Mobile Number</Label>
        <div className="flex overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring/50">
          <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">+91</span>
          <Input
            type="tel"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
            className="rounded-none border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Teacher"}</Button>
    </form>
  );
}
