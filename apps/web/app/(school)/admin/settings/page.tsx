"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.from("schools").update({ name, contact_email: contactEmail }).eq("id", schoolId);
    setLoading(false);
    if (error) {
      toast.error("Failed to save settings. Please try again.");
    } else {
      toast.success("Settings saved successfully.");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Update your school's basic information.</p>
      </div>
      <div className="max-w-lg">
        <form onSubmit={handleSave} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">School Name</Label>
            <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
