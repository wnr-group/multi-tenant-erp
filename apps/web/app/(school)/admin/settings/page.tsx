export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: school } = await supabase
    .from("schools")
    .select("name, contact_email, address, logo_url")
    .eq("id", schoolId)
    .single();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Update your school's information.</p>
      </div>
      <SettingsForm
        schoolId={schoolId}
        initialName={school?.name ?? ""}
        initialContactEmail={(school as any)?.contact_email ?? ""}
        initialAddress={(school as any)?.address ?? ""}
        initialLogoUrl={(school as any)?.logo_url ?? null}
      />
    </div>
  );
}
