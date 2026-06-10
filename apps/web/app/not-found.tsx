import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1B2A] px-6 text-center">
      <h1 className="text-6xl font-extrabold text-[#1BABB4]">404</h1>
      <p className="mt-4 text-lg text-slate-300">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-[#1BABB4] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#17969e]"
      >
        Back to Home
      </Link>
    </div>
  );
}
