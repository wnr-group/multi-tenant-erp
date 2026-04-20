"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [contactEmail, setContactEmail] = useState("");
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

    toast.success("School created. Now invite users from the school detail page.");
    router.push(`/platform-admin/schools/${school.id}`);
    router.refresh();
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create School"}
        </Button>
      </form>
    </div>
  );
}
