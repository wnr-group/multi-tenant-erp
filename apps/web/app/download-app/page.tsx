import { headers } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { Smartphone } from "lucide-react";
import { AppStoreRedirect } from "./app-store-redirect";

export default async function DownloadAppPage() {
  const headersList = await headers();
  const host        = headersList.get("host") ?? "";
  const domain      = host.replace(/:\d+$/, "");
  const userAgent   = headersList.get("user-agent") ?? "";

  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name, app_store_url, play_store_url, primary_color")
    .eq("domain", domain)
    .single();

  const schoolName  = school?.name ?? "Your School";
  const appStoreUrl = school?.app_store_url ?? null;
  const playStoreUrl = school?.play_store_url ?? null;
  const brandColor  = school?.primary_color ?? "#4f46e5";

  // Server-side UA sniff for the initial render/redirect hint
  const isIos     = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 px-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: brandColor }}
      >
        <Smartphone className="h-8 w-8 text-white" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-900">{schoolName}</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The student and parent portal is available on the mobile app.
        Download it to check attendance, results, homework, and more.
      </p>

      {/* Client component handles instant redirect + fallback buttons */}
      <AppStoreRedirect
        appStoreUrl={appStoreUrl}
        playStoreUrl={playStoreUrl}
        serverIsIos={isIos}
        serverIsAndroid={isAndroid}
        brandColor={brandColor}
      />

      {!appStoreUrl && !playStoreUrl && (
        <p className="mt-6 text-xs text-gray-400">
          The school administrator has not set up app download links yet.
        </p>
      )}
    </main>
  );
}
