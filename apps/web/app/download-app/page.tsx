import { headers } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { Smartphone } from "lucide-react";

export default async function DownloadAppPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");

  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name, app_store_url, play_store_url, primary_color")
    .eq("domain", domain)
    .single();

  const schoolName = school?.name ?? "Your School";
  const appStoreUrl = school?.app_store_url;
  const playStoreUrl = school?.play_store_url;
  const brandColor = school?.primary_color ?? "#4f46e5";

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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {appStoreUrl ? (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            App Store
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-gray-500">
            App Store — coming soon
          </span>
        )}
        {playStoreUrl ? (
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.997l2.834 1.64a1 1 0 010 1.7l-2.834 1.64-2.522-2.522 2.522-2.458zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
            </svg>
            Google Play
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-gray-500">
            Google Play — coming soon
          </span>
        )}
      </div>

      {!appStoreUrl && !playStoreUrl && (
        <p className="mt-6 text-xs text-gray-400">
          The school administrator has not set up app download links yet.
        </p>
      )}
    </main>
  );
}
