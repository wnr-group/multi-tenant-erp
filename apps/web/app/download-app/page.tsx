import { Smartphone } from "lucide-react";

export default function DownloadAppPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
        <Smartphone className="h-8 w-8 text-indigo-600" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-gray-900">
        Use the Mobile App
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The student and parent portal is available on the mobile app.
        Download it to check attendance, results, homework, and more.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          App Store
        </a>
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.997l2.834 1.64a1 1 0 010 1.7l-2.834 1.64-2.522-2.522 2.522-2.458zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
          </svg>
          Google Play
        </a>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        App links will be updated once the mobile app is published.
      </p>
    </div>
  );
}
