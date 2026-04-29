"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export function GalleryGrid({ images, schoolId }: { images: GalleryImage[]; schoolId: string }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(img: GalleryImage) {
    if (!confirm("Remove this image from the gallery?")) return;
    setDeletingId(img.id);
    const supabase = createClient();

    // Delete storage object — path is everything after the bucket root
    const url = new URL(img.image_url);
    const pathParts = url.pathname.split("/school-gallery/");
    if (pathParts[1]) {
      await supabase.storage.from("school-gallery").remove([decodeURIComponent(pathParts[1])]);
    }

    const { error } = await supabase.from("school_gallery").delete().eq("id", img.id);
    if (error) toast.error(error.message);
    else { toast.success("Image removed."); router.refresh(); }
    setDeletingId(null);
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-gray-400">
        <div className="text-5xl mb-3">🖼️</div>
        <p className="text-sm font-medium">No images yet</p>
        <p className="text-xs mt-1">Upload images to display in the parent app carousel</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((img) => (
        <div key={img.id} className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
          <Image
            src={img.image_url}
            alt={img.caption ?? "Gallery image"}
            fill
            className="object-cover"
            unoptimized
          />
          {img.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
              <p className="text-white text-xs font-medium truncate">{img.caption}</p>
            </div>
          )}
          <button
            onClick={() => handleDelete(img)}
            disabled={deletingId === img.id}
            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
