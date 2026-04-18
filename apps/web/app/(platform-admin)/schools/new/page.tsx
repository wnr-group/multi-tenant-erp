"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [contactEmail, setContactEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({ name, domain, primary_color: primaryColor, contact_email: contactEmail })
      .select()
      .single();

    if (schoolError || !school) {
      setError(schoolError?.message ?? "Failed to create school");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        fullName: adminName,
        schoolId: school.id,
        role: "school_admin",
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to invite admin");
      setLoading(false);
      return;
    }

    router.push("/platform-admin/schools");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New School</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        {error && (
          <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}
        <div>
          <Label>School Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Web Domain (e.g. school2.lvh.me for local dev)</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="school2.lvh.me" required />
        </div>
        <div>
          <Label>Primary Color (hex)</Label>
          <div className="flex items-center gap-2">
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563EB" />
            <div className="h-8 w-8 rounded border" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
        <div>
          <Label>School Contact Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <hr className="my-2" />
        <p className="text-sm font-medium text-gray-700">School Admin</p>
        <div>
          <Label>Admin Full Name</Label>
          <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
        </div>
        <div>
          <Label>Admin Email</Label>
          <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create School & Invite Admin"}
        </Button>
      </form>
    </div>
  );
}
