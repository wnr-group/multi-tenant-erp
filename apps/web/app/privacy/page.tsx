import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ConnectMySkool privacy policy — how we collect, use, and protect your data.",
  alternates: { canonical: "https://connectmyskool.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] px-6 py-16 text-slate-300">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#1BABB4] hover:underline">&larr; Back to Home</Link>
        <h1 className="mt-8 text-3xl font-extrabold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: June 2026</p>

        <section className="mt-10 space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
            <p className="mt-2">
              ConnectMySkool collects information provided by schools during onboarding — including student names,
              parent contact details, attendance records, and fee transactions. We only collect data necessary to
              provide the service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">2. How We Use Your Data</h2>
            <p className="mt-2">
              Data is used solely to power your school&apos;s ERP portal and parent mobile app. We do not sell,
              share, or use your data for advertising purposes.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">3. Data Security</h2>
            <p className="mt-2">
              All data is encrypted in transit (TLS) and at rest. We use Supabase&apos;s enterprise-grade
              infrastructure with row-level security policies ensuring schools can only access their own data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">4. Data Retention</h2>
            <p className="mt-2">
              School data is retained for the duration of the subscription. Upon cancellation, data can be
              exported and is deleted within 30 days of request.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">5. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries, contact us at{" "}
              <a href="mailto:balaji.p2prhel@gmail.com" className="text-[#1BABB4] hover:underline">
                balaji.p2prhel@gmail.com
              </a>.
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
