"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface Props {
  schoolId: string;
  initialName: string;
  initialContactEmail: string;
  initialAddress: string;
  initialLogoUrl: string | null;
}

export function SettingsForm({ schoolId, initialName, initialContactEmail, initialAddress, initialLogoUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [address, setAddress] = useState(initialAddress);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB."); return; }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${schoolId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("school-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from("schools").update({ logo_url: publicUrl }).eq("id", schoolId);
    if (dbError) { toast.error(dbError.message); setUploading(false); return; }

    setLogoUrl(publicUrl);
    toast.success("Logo updated.");
    setUploading(false);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("schools").update({
      name,
      contact_email: contactEmail,
      address: address || null,
    }).eq("id", schoolId);
    setLoading(false);
    if (error) { toast.error(error.message || "Failed to save settings."); } else { toast.success("Settings saved."); router.refresh(); }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Logo upload */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">School Logo</h2>
        <div className="flex items-center gap-5">
          <div
            className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center hover:border-indigo-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="School logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Camera className="h-7 w-7 text-gray-300" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Upload school logo</p>
            <p className="text-xs text-gray-400 mt-0.5">PNG or JPG, max 2 MB. Used on certificates and letterheads.</p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Choose file"}
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* General info form */}
      <form onSubmit={handleSave} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="school-name">School Name</Label>
          <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Contact Email</Label>
          <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">School Address</Label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={"KG Campus: 123 Main Road, City - 600001\nHigh School Campus: 456 Second Street, City - 600002"}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground">Shown on certificates and other official documents.</p>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
