"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CertificateData {
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolAddress: string | null;
  studentName: string;
  admissionNumber: string | null;
  className: string;
  sectionName: string;
  parentName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  academicYearName: string;
  studentProfileId: string;
  backHref: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function genderText(gender: string | null): { relation: string; pronoun: string; salutation: string } {
  if (gender === "male")   return { relation: "son",      pronoun: "His",   salutation: "Mr." };
  if (gender === "female") return { relation: "daughter", pronoun: "Her",   salutation: "Mrs." };
  return                          { relation: "child",    pronoun: "Their", salutation: "Mr./Mrs." };
}

export function CertificateView({ data }: { data: CertificateData }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [logging, setLogging] = useState(false);
  const { relation, pronoun, salutation } = genderText(data.gender);
  const hasWarning = !data.dateOfBirth || !data.parentName || !data.gender;

  async function handlePrint() {
    setLogging(true);
    try {
      await fetch("/api/certificates/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_profile_id: data.studentProfileId }),
      });
    } catch {
      // Non-blocking — proceed with print even if log fails
    }
    setLogging(false);

    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bonafide Certificate — ${data.studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; padding: 48px 56px; color: #1a1a1a; font-size: 14px; line-height: 1.6; }
            .header { display: flex; align-items: flex-start; gap: 20px; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; margin-bottom: 40px; }
            .header img { width: 72px; height: 72px; object-fit: contain; }
            .header-text h1 { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #1a1a1a; margin-bottom: 4px; }
            .header-text p { font-size: 11px; color: #444; }
            .title { text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; letter-spacing: 1px; margin-bottom: 36px; }
            .body-text { text-align: justify; font-size: 14px; line-height: 2; text-indent: 48px; position: relative; z-index: 1; }
            .watermark-wrap { position: relative; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 220px; height: 220px; opacity: 0.08; object-fit: contain; z-index: 0; }
            .footer { display: flex; justify-content: space-between; margin-top: 80px; font-size: 13px; }
            @media print { body { padding: 48px 56px; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${data.schoolLogoUrl ? `<img src="${data.schoolLogoUrl}" alt="Logo" />` : ""}
            <div class="header-text">
              <h1>${data.schoolName}</h1>
              ${data.schoolAddress ? data.schoolAddress.split("\n").map((line: string) => `<p>${line}</p>`).join("") : ""}
            </div>
          </div>

          <div class="title">TO WHOM IT MAY CONCERN</div>

          <div class="watermark-wrap">
            ${data.schoolLogoUrl ? `<img class="watermark" src="${data.schoolLogoUrl}" alt="" />` : ""}
            <p class="body-text">
              This is to certify that <strong>${data.studentName.toUpperCase()}</strong>, a student of
              <strong>${data.className} - ${data.sectionName}</strong>, Adm No. ${data.admissionNumber ?? "—"},
              ${relation} of ${salutation} <strong>${(data.parentName ?? "—").toUpperCase()}</strong>
              is a bonafide student of our school for the academic year
              <strong>${data.academicYearName}</strong>.
              ${pronoun} date of birth is <strong>${formatDate(data.dateOfBirth)}</strong> as per our school records.
            </p>
          </div>

          <div class="footer">
            <span>Date : ${formatDate(new Date().toISOString().slice(0, 10))}</span>
            <span>PRINCIPAL</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href={data.backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Certificates
          </Link>
          <Button onClick={handlePrint} disabled={logging} className="gap-2">
            <Printer className="h-4 w-4" />
            {logging ? "Preparing…" : "Print / Download PDF"}
          </Button>
        </div>

        {hasWarning && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Some student details are missing (
            {[!data.dateOfBirth && "date of birth", !data.parentName && "parent name", !data.gender && "gender"].filter(Boolean).join(", ")}
            ). <Link href={`/admin/students/${data.studentProfileId}`} className="font-medium underline">Edit the student profile</Link> to fill them in before printing.
          </div>
        )}

        <div ref={printRef} className="rounded-xl border border-border bg-white p-12 shadow-sm font-serif">
          <div className="flex items-start gap-5 border-b-2 border-gray-900 pb-3 mb-10">
            {data.schoolLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.schoolLogoUrl} alt="Logo" className="h-16 w-16 object-contain shrink-0" />
            )}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">{data.schoolName}</h1>
              {data.schoolAddress && data.schoolAddress.split("\n").map((line, i) => (
                <p key={i} className="text-xs text-gray-500">{line}</p>
              ))}
            </div>
          </div>

          <p className="text-center text-sm font-bold underline tracking-widest mb-10">TO WHOM IT MAY CONCERN</p>

          <div className="relative">
            {data.schoolLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.schoolLogoUrl}
                alt=""
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-52 w-52 object-contain opacity-[0.07] pointer-events-none"
              />
            )}
            <p className="text-sm leading-loose text-justify indent-12 relative z-10">
              This is to certify that{" "}
              <strong className="uppercase">{data.studentName}</strong>, a student of{" "}
              <strong>{data.className} - {data.sectionName}</strong>, Adm No. {data.admissionNumber ?? "—"}{" "}
              {relation} of {salutation}{" "}
              <strong className="uppercase">{data.parentName ?? "—"}</strong>{" "}
              is a bonafide student of our school for the academic year{" "}
              <strong>{data.academicYearName}</strong>.{" "}
              {pronoun} date of birth is{" "}
              <strong>{formatDate(data.dateOfBirth)}</strong> as per our school records.
            </p>
          </div>

          <div className="mt-20 flex justify-between text-sm">
            <span>Date : {formatDate(new Date().toISOString().slice(0, 10))}</span>
            <span className="font-medium">PRINCIPAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
