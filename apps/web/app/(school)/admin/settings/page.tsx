"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("school_id").eq("id", user.id).single().then(({ data: p }) => {
        if (!p?.school_id) return;
        setSchoolId(p.school_id);
        supabase.from("schools").select("name, contact_email").eq("id", p.school_id).single().then(({ data: s }) => {
          if (!s) return;
          setName(s.name);
          setContactEmail(s.contact_email ?? "");
        });
      });
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("schools").update({ name, contact_email: contactEmail }).eq("id", schoolId);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">School Settings</h1>
      <form onSubmit={handleSave} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <div><Label>School Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>Contact Email</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
        <Button type="submit" disabled={loading}>{saved ? "Saved!" : loading ? "Saving…" : "Save Changes"}</Button>
      </form>
    </div>
  );
}
