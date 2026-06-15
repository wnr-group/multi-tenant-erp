import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "School Not Found",
  robots: { index: false, follow: false },
};

export default function SchoolNotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F6F9FB] px-6 font-[family-name:var(--font-display)] text-[#0D1B2A]">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1BABB4]/15 blur-[120px]" />

      <div className="relative flex flex-col items-center text-center">
        <Image
          src="/logo-mark.webp"
          alt="ConnectMySkool"
          width={56}
          height={56}
          className="rounded-xl"
        />

        <span className="mt-8 inline-block rounded-full border border-[#1BABB4]/40 bg-[#1BABB4]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0E8A92]">
          Error 404
        </span>

        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          This school portal{" "}
          <span className="text-[#0E8A92]">doesn&apos;t exist</span>
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
          The web address you entered isn&apos;t linked to any school on
          ConnectMySkool. Check the link from your school, or reach out to your
          school administrator.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://connectmyskool.com"
            className="rounded-full bg-[#1BABB4] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1BABB4]/20 transition-all hover:scale-[1.03] hover:bg-[#17969e] active:scale-[0.97]"
          >
            Go to ConnectMySkool
          </a>
          <a
            href="https://wa.me/919789471572"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#0D1B2A] transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
