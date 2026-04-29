"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function UploadImageDialog({
  schoolId,
  uploadedBy,
}: {
  schoolId: string;
  uploadedBy: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) { toast.error("Please select an image."); return; }
    setLoading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${schoolId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("school-gallery")
      .upload(path, file, { contentType: file.type });

    if (uploadError) { toast.error(uploadError.message); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from("school-gallery").getPublicUrl(path);

    const { error: dbError } = await supabase.from("school_gallery").insert({
      school_id: schoolId,
      image_url: urlData.publicUrl,
      caption: caption.trim() || null,
      uploaded_by: uploadedBy,
      display_order: 0,
    });

    if (dbError) { toast.error(dbError.message); setLoading(false); return; }

    toast.success("Image uploaded.");
    setOpen(false);
    setFile(null);
    setPreview(null);
    setCaption("");
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Upload Image</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Gallery Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="relative cursor-pointer border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ height: 200 }}
          >
            {preview ? (
              <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-gray-400 text-sm">
                <div>
                  <div className="text-3xl mb-2">🖼️</div>
                  Click to select an image
                </div>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div>
            <Label>Caption (optional)</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Annual Sports Day 2026"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={loading || !file}>
              {loading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
