import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { GalleryGrid } from "./gallery-grid";
import { UploadImageDialog } from "./upload-image-dialog";

export default async function GalleryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const { data: images } = await supabase
    .from("school_gallery")
    .select("id, image_url, caption, display_order, created_at")
    .eq("school_id", schoolId)
    .order("display_order")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery"
        description="Upload images that appear as a carousel on the parent app dashboard."
        action={<UploadImageDialog schoolId={schoolId} uploadedBy={user!.id} />}
      />
      <GalleryGrid images={images ?? []} schoolId={schoolId} />
    </div>
  );
}
