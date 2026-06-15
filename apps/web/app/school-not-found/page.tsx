import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "School Not Found",
  robots: { index: false, follow: false },
};

export default function SchoolNotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0D1B2A] px-6 font-[family-name:var(--font-display)] text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1BABB4]/10 blur-[120px]" />

      <div className="relative flex flex-col items-center text-center">
        <Image
          src="/logo-mark.webp"
          alt="ConnectMySkool"
          width={56}
          height={56}
          className="rounded-xl"
        />

        <span className="mt-8 inline-block rounded-full border border-[#1BABB4]/40 bg-[#1BABB4]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#1BABB4]">
          Error 404
        </span>

        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          This school portal{" "}
          <span className="text-[#1BABB4]">doesn&apos;t exist</span>
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
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
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
