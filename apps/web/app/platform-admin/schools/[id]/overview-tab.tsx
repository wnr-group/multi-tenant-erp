"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface School {
  id: string;
  name: string;
  domain: string;
  primary_color: string;
  contact_email: string;
}

interface RoleCounts {
  school_admin: number;
  principal: number;
  teacher: number;
  student: number;
  parent: number;
}

interface Props {
  school: School;
  roleCounts: RoleCounts;
}

const ROLE_LABELS: { key: keyof RoleCounts; label: string }[] = [
  { key: "school_admin", label: "Admins" },
  { key: "principal", label: "Principals" },
  { key: "teacher", label: "Teachers" },
  { key: "student", label: "Students" },
  { key: "parent", label: "Parents" },
];

export function OverviewTab({ school, roleCounts }: Props) {
  const router = useRouter();
  const [name, setName] = useState(school.name);
  const [domain, setDomain] = useState(school.domain);
  const [primaryColor, setPrimaryColor] = useState(school.primary_color);
  const [contactEmail, setContactEmail] = useState(school.contact_email);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain,
          primary_color: primaryColor,
          contact_email: contactEmail,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Failed to save");
      }
      toast.success("School info updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Role count stats */}
      <div className="grid grid-cols-5 gap-3">
        {ROLE_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-lg border bg-white px-4 py-3 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-gray-900">{roleCounts[key]}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Editable form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold text-gray-800">School Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">Name</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="School name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="school-domain">Domain</Label>
            <Input
              id="school-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. myschool"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="school-email">Contact Email</Label>
            <Input
              id="school-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="admin@school.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="school-color">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor || "#6366f1"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <Input
                id="school-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
