"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCsv } from "@/lib/csv-parser";

interface StudentRow {
  id: string;
  name: string;
  roll: string;
  admission_number: string;
  class_name: string;
  section: string;
  email: string;
  parent_phone: string;
}

interface BulkActionsProps {
  students: StudentRow[];
}

export function BulkActions({ students }: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleDownload() {
    const headers = ["full_name", "email", "roll_number", "admission_number", "class_name", "section_name", "parent_phone"];
    const csvRows = students.map((s) =>
      [s.name, s.email, s.roll, s.admission_number, s.class_name, s.section, s.parent_phone]
        .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function handleDownloadTemplate() {
    const headers = "full_name,email,roll_number,admission_number,class_name,section_name,parent_phone\n";
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setOpen(false);

    const text = await file.text();
    const { rows } = parseCsv(text);

    const importRows = rows.map((r) => ({
      full_name: r.full_name ?? "",
      email: r.email ?? "",
      roll_number: r.roll_number ?? "",
      admission_number: r.admission_number ?? "",
      class_name: r.class_name ?? "",
      section_name: r.section_name ?? "",
      parent_phone: r.parent_phone ?? "",
    }));

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });
      const data = await res.json();
      const results = data.results ?? [];
      setResult({
        created: results.filter((r: any) => r.status === "created").length,
        updated: results.filter((r: any) => r.status === "updated").length,
        errors: results.filter((r: any) => r.status === "error").length,
      });
      router.refresh();
    } catch {
      setResult({ created: 0, updated: 0, errors: 1 });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        disabled={uploading}
      >
        {uploading ? "Importing..." : "Bulk Actions"}
        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
            <button
              onClick={handleDownload}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Download Students
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </>
      )}

      {result && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">Import Complete</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <li className="text-green-600">{result.created} created</li>
            <li className="text-blue-600">{result.updated} updated</li>
            {result.errors > 0 && <li className="text-red-600">{result.errors} errors</li>}
          </ul>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
