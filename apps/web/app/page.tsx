import type { Metadata } from "next";
import Image from "next/image";
import {
  CheckCircle,
  BarChart3,
  Smartphone,
  FileText,
  Calendar,
  Bell,
  TrendingUp,
  Clock,
  Shield,
  ArrowRight,
  Menu,
} from "lucide-react";
import { AnimateOnScroll, StaggerChildren } from "@/components/animate-on-scroll";
import { HeroReveal, HeroFloat } from "@/components/hero-animations";

export const metadata: Metadata = {
  title: "ConnectMySkool — The School ERP That Connects Everyone",
  description:
    "ConnectMySkool gives your school a powerful web portal for staff and a branded mobile app for parents. Attendance, fees, report cards — setup in 48 hours.",
  alternates: {
    canonical: "https://connectmyskool.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "ConnectMySkool",
      url: "https://connectmyskool.com",
      logo: "https://connectmyskool.com/logo-mark.png",
      contactPoint: {
        "@type": "ContactPoint",
        email: "balaji.p2prhel@gmail.com",
        contactType: "sales",
        availableLanguage: ["English", "Tamil"],
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "ConnectMySkool",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, Android, iOS",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free demo available",
      },
      description:
        "School ERP platform with web portal for admins/teachers and mobile app for parents. Covers attendance, fees, report cards, timetable, and more.",
    },
  ],
};

export default function MarketingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0D1B2A] font-[family-name:var(--font-display)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0D1B2A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.webp" alt="ConnectMySkool logo" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight">ConnectMySkool</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-400 transition-colors hover:text-white">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-400 transition-colors hover:text-white">How It Works</a>
            <a href="#testimonial" className="text-sm text-slate-400 transition-colors hover:text-white">Testimonials</a>
            <a href="#contact" className="text-sm text-slate-400 transition-colors hover:text-white">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="hidden rounded-full bg-[#1BABB4] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#17969e] md:block"
            >
              Book a Demo
            </a>
            <button className="md:hidden text-slate-400" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#1BABB4]/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left */}
          <div>
            <HeroReveal delay={100}>
              <span className="mb-4 inline-block rounded-full border border-[#1BABB4]/40 bg-[#1BABB4]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#1BABB4] md:px-4 md:py-1.5 md:text-xs">
                One Platform. Every Stakeholder.
              </span>
            </HeroReveal>
            <HeroReveal delay={200}>
              <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-6xl">
                The School ERP That{" "}
                <span className="text-[#1BABB4]">Connects Everyone</span>
                {" "}— Admins, Teachers &amp; Parents.
              </h1>
            </HeroReveal>
            <HeroReveal delay={350}>
              <p className="mt-4 text-base leading-relaxed text-slate-400 md:mt-6 md:text-lg">
                ConnectMySkool gives your school a powerful web portal for staff and
                a beautifully branded mobile app for parents — all in one platform.
              </p>
            </HeroReveal>
            <HeroReveal delay={500}>
              <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
                <a
                  href="#contact"
                  className="flex items-center gap-2 rounded-full bg-[#1BABB4] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1BABB4]/20 transition-all hover:bg-[#17969e] hover:scale-[1.03] active:scale-[0.97]"
                >
                  Book a Demo <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/919789471572"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 hover:scale-[1.03] active:scale-[0.97]"
                >
                  <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              </div>
            </HeroReveal>
            <HeroReveal delay={650}>
              <div className="mt-6 flex flex-wrap items-center gap-4 md:mt-8 md:gap-6">
                {[
                  { icon: CheckCircle, text: "No long contracts" },
                  { icon: Clock, text: "Setup in 48 hours" },
                  { icon: Shield, text: "Built for Indian schools" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-slate-400 md:gap-2 md:text-sm">
                    <Icon className="h-3.5 w-3.5 text-[#1BABB4] md:h-4 md:w-4" />
                    {text}
                  </div>
                ))}
              </div>
            </HeroReveal>
          </div>

          {/* Right — Real dashboard screenshot (hidden on mobile) */}
          <HeroFloat delay={400} className="relative hidden justify-center lg:flex lg:justify-end">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 rounded-2xl bg-[#1BABB4]/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-[#1BABB4]/10">
                <div className="flex items-center gap-2 border-b border-white/10 bg-[#0D1B2A] px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <div className="mx-auto flex-1 max-w-xs rounded bg-white/5 px-3 py-1 text-center text-xs text-slate-500">
                    school.connectmyskool.com/admin/dashboard
                  </div>
                </div>
                <Image
                  src="/screenshots/01-dashboard.webp"
                  alt="ConnectMySkool admin dashboard showing attendance, fees, and student overview"
                  width={720}
                  height={540}
                  priority
                  className="w-full"
                />
              </div>
              <div className="absolute -bottom-4 -left-6 flex items-center gap-2 rounded-full border border-[#1BABB4]/30 bg-[#0D1B2A] px-4 py-2 shadow-xl">
                <CheckCircle className="h-3.5 w-3.5 text-[#1BABB4]" />
                <span className="text-xs font-medium text-white">Attendance marked in 30 sec</span>
              </div>
              <div className="absolute -right-6 top-8 flex items-center gap-2 rounded-full border border-[#F5A623]/30 bg-[#0D1B2A] px-4 py-2 shadow-xl">
                <Bell className="h-3.5 w-3.5 text-[#F5A623]" />
                <span className="text-xs font-medium text-white">Fee reminders on autopilot</span>
              </div>
            </div>
          </HeroFloat>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="overflow-hidden border-y border-white/5 bg-[#0A1520] py-4">
        <div
          className="flex gap-6 whitespace-nowrap motion-reduce:animate-none"
          style={{ animation: "marquee 30s linear infinite", display: "flex", width: "max-content" }}
        >
          {Array.from({ length: 2 }).flatMap(() =>
            [
              "✓ Attendance marked in 30 sec",
              "✓ Fee reminders on autopilot",
              "✓ Report cards in one click",
              "✓ Zero paperwork",
              "✓ Parents always informed",
              "✓ Timetable published digitally",
              "✓ Certificates generated instantly",
              "✓ Class-wise analytics",
              "✓ Built for Indian schools",
            ].map((text, i) => (
              <span
                key={`${text}-${i}`}
                className="rounded-full border border-[#1BABB4]/30 px-4 py-1.5 text-xs font-medium text-slate-300"
              >
                {text}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── PRODUCT SHOWCASE ── */}
      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <AnimateOnScroll className="mb-8 text-center md:mb-12">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1BABB4] md:text-xs">Product</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
              Everything your school needs,<br className="hidden sm:block" /> beautifully designed.
            </h2>
            <p className="mt-3 text-sm text-slate-400 md:mt-4 md:text-base">
              Stop jumping between clunky tools. ConnectMySkool brings administration,<br className="hidden md:block" />
              academics, and communication into one seamless, intuitive interface.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200} from="scale">
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.06] p-4 pb-0 shadow-2xl ring-1 ring-white/10 md:rounded-3xl md:p-6 md:pb-0 lg:p-10 lg:pb-0">
              {/* Stat bar */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 md:mb-8 lg:gap-16">
                {[
                  { label: "Total Students", value: "1,021" },
                  { label: "Present Today", value: "984" },
                  { label: "Total Teachers", value: "45" },
                  { label: "Fee Pending", value: "₹4.2L", accent: true },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className={`mt-1 text-2xl font-extrabold ${s.accent ? "text-[#F5A623]" : "text-white"}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Composite: phones overlap dashboard */}
              <div className="relative mx-auto flex items-end justify-center">
                {/* Teacher phone */}
                <div className="relative z-20 -mr-8 mb-[-80px] hidden w-[210px] flex-shrink-0 self-end lg:block xl:w-[240px]">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[#1BABB4]/30 bg-[#0D1B2A] px-3 py-1.5 shadow-xl whitespace-nowrap z-30">
                    <CheckCircle className="h-3 w-3 text-[#1BABB4]" />
                    <span className="text-[10px] font-medium text-white">Attendance marked in 30 seconds</span>
                  </div>
                  <div className="overflow-hidden rounded-[28px] border-2 border-white/20 shadow-2xl shadow-black/50">
                    <Image src="/screenshots/mobile-11-attendance.webp" alt="Teacher marking attendance on ConnectMySkool mobile app" width={540} height={1170} className="w-full" />
                  </div>
                </div>

                {/* Dashboard */}
                <div className="relative z-10 w-full max-w-3xl flex-shrink-0 overflow-hidden rounded-t-2xl border border-b-0 border-white/10 shadow-2xl shadow-[#1BABB4]/10">
                  <div className="flex items-center gap-2 border-b border-white/10 bg-[#0D1B2A] px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500/60" />
                      <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
                      <div className="h-2 w-2 rounded-full bg-green-500/60" />
                    </div>
                    <div className="ml-3 flex-1 rounded bg-white/5 px-3 py-1 text-xs text-slate-500">
                      school.connectmyskool.com/admin/dashboard
                    </div>
                  </div>
                  <Image src="/screenshots/01-dashboard.webp" alt="Full admin dashboard with student and fee overview" width={1440} height={900} className="w-full" />
                </div>

                {/* Parent phone */}
                <div className="relative z-20 -ml-8 mb-[-80px] hidden w-[210px] flex-shrink-0 self-end lg:block xl:w-[240px]">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[#F5A623]/30 bg-[#0D1B2A] px-3 py-1.5 shadow-xl whitespace-nowrap z-30">
                    <Bell className="h-3 w-3 text-[#F5A623]" />
                    <span className="text-[10px] font-medium text-white">Fee reminders sent automatically</span>
                  </div>
                  <div className="overflow-hidden rounded-[28px] border-2 border-white/20 shadow-2xl shadow-black/50">
                    <Image src="/screenshots/mobile-parent-01-dashboard.webp" alt="Parent mobile app showing child attendance and homework" width={540} height={1170} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="relative bg-[#0A1520] px-5 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <AnimateOnScroll className="text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1BABB4] md:text-xs">Features</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">Built for every role in your school.</h2>
            <p className="mt-3 text-sm text-slate-400 md:mt-4 md:text-base">From the principal&apos;s dashboard to the parent&apos;s phone — every touchpoint covered.</p>
          </AnimateOnScroll>
          <StaggerChildren className="mt-8 grid gap-4 sm:grid-cols-2 md:mt-14 md:gap-5 lg:grid-cols-3" staggerMs={120} baseDelay={100}>
            {[
              { icon: CheckCircle, title: "Attendance Management", desc: "Teachers mark attendance on web in seconds; parents see it instantly on the mobile app.", color: "#1BABB4" },
              { icon: TrendingUp, title: "Fee Collection & Tracking", desc: "Track dues, generate receipts, and send automated payment reminders to parents.", color: "#F5A623" },
              { icon: Smartphone, title: "Parent Mobile App", desc: "A branded app for your school. Academics, fees, attendance — all in one place.", color: "#4CAF50" },
              { icon: FileText, title: "Report Cards & Certificates", desc: "Generate and share digital report cards and achievement certificates instantly.", color: "#2979FF" },
              { icon: BarChart3, title: "Principal Analytics", desc: "School-wide dashboards with attendance trends, fee collection, and class performance.", color: "#1BABB4" },
              { icon: Calendar, title: "Timetable & Homework", desc: "Publish class timetables and homework assignments digitally — no WhatsApp groups needed.", color: "#F5A623" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-200 hover:border-[#1BABB4]/30 hover:bg-white/[0.05] hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1BABB4] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Learn more <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative px-5 py-16 md:px-6 md:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1BABB4]/5 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <AnimateOnScroll>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1BABB4] md:text-xs">Process</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">Up and running in 3 simple steps.</h2>
            <p className="mt-4 text-slate-400">No IT team needed. We handle everything.</p>
          </AnimateOnScroll>
          <StaggerChildren className="relative mt-16 grid gap-8 md:grid-cols-3" staggerMs={150}>
            {[
              { n: "1", title: "We Set Up Your School", desc: "We configure your portal, import your student data, and build your branded parent app." },
              { n: "2", title: "Your Staff Gets Started", desc: "Teachers and admins log in to the web portal. We train your full team in one session." },
              { n: "3", title: "Parents Stay Connected", desc: "Parents download your school's app and get real-time updates on everything." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1BABB4] bg-[#1BABB4]/10 text-lg font-extrabold text-[#1BABB4]">
                  {n}
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </StaggerChildren>
          <AnimateOnScroll delay={400}>
            <a
              href="#contact"
              className="mt-12 inline-flex items-center gap-2 rounded-full bg-[#1BABB4] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1BABB4]/20 transition-all hover:bg-[#17969e] hover:scale-[1.03] active:scale-[0.97]"
            >
              Book a Free Demo <ArrowRight className="h-4 w-4" />
            </a>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section id="testimonial" className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <AnimateOnScroll from="scale">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:rounded-3xl">
              <div className="grid md:grid-cols-2">
                <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r md:p-10">
                  <div className="mb-4 text-5xl font-serif leading-none text-[#1BABB4]/40 md:mb-6 md:text-6xl">&ldquo;</div>
                  <p className="text-base font-medium leading-relaxed text-white md:text-xl">
                    ConnectMySkool transformed how we communicate with parents.
                    Fee collection alone saves us 3 hours a week.
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1BABB4]/20 text-sm font-bold text-[#1BABB4]">
                      AM
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Dr. Anjali Mehta</p>
                      <p className="text-xs text-slate-400">Principal, St. Xavier&apos;s International</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  {[
                    { value: "98%", label: "Parent app adoption rate" },
                    { value: "3×", label: "Faster fee collection" },
                    { value: "0%", label: "Data entry errors" },
                    { value: "15 hrs", label: "Saved weekly on admin" },
                  ].map(({ value, label }, i) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center justify-center p-4 text-center border-white/10 md:p-8 ${i < 2 ? "border-b" : ""} ${i % 2 === 0 ? "border-r" : ""}`}
                    >
                      <p className="text-xl font-extrabold text-[#1BABB4] md:text-3xl">{value}</p>
                      <p className="mt-1 text-[10px] text-slate-400 md:text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section id="contact" className="relative overflow-hidden px-5 py-16 md:px-6 md:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#1BABB4]/10 blur-[100px]" />
        <AnimateOnScroll className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Ready to connect your school?
          </h2>
          <p className="mt-4 text-sm text-slate-400 md:mt-5 md:text-lg">
            See ConnectMySkool in action — a live demo tailored to your school&apos;s needs, no commitment required.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:mt-8">
            <a
              href="mailto:balaji.p2prhel@gmail.com"
              className="flex items-center gap-2 rounded-full bg-[#1BABB4] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1BABB4]/20 transition-all hover:bg-[#17969e] hover:scale-[1.03] active:scale-[0.97]"
            >
              Book a Demo <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/919789471572"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 hover:scale-[1.03] active:scale-[0.97]"
            >
              <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </AnimateOnScroll>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-slate-500 md:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo-mark.webp" alt="ConnectMySkool" width={20} height={20} />
            <span>© {new Date().getFullYear()} ConnectMySkool. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-reduce\\:animate-none {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
