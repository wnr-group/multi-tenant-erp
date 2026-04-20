"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCsv, generateCsvTemplate, validateRow, type CsvRow } from "@/lib/csv-parser";

type Role = "student" | "teacher" | "parent";

interface ValidatedRow {
  index: number;
  row: CsvRow;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  index: number;
  ok: boolean;
  message: string;
}

interface Props {
  schoolId: string;
}

export function ImportTab({ schoolId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = useState<Role>("student");
  const [headers, setHeaders] = useState<string[]>([]);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  // ── Template download ──────────────────────────────────────────────────────
  function handleDownloadTemplate() {
    const csv = generateCsvTemplate(role);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${role}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── File upload & parse ────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: parsedHeaders, rows } = parseCsv(text);
      setHeaders(parsedHeaders);
      setResults(null);

      const validated: ValidatedRow[] = rows.map((row, i) => {
        const { valid, error } = validateRow(row, role);
        return { index: i + 1, row, valid, error };
      });
      setValidatedRows(validated);

      if (validated.length === 0) {
        toast.error("No data rows found in the CSV.");
      } else {
        const errorCount = validated.filter((r) => !r.valid).length;
        if (errorCount > 0) {
          toast.warning(`Parsed ${validated.length} rows — ${errorCount} have errors.`);
        } else {
          toast.success(`Parsed ${validated.length} rows — all valid.`);
        }
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-selected after role change
    e.target.value = "";
  }

  // ── Import action ──────────────────────────────────────────────────────────
  async function handleImport() {
    const validRows = validatedRows
      .filter((r) => r.valid)
      .map(({ row }) => ({
        full_name: row.full_name,
        email: row.email,
        ...(row.roll_number ? { roll_number: row.roll_number } : {}),
        ...(row.class ? { class_name: row.class } : {}),
        ...(row.section ? { section_name: row.section } : {}),
        ...(row.student_email ? { student_email: row.student_email } : {}),
      }));

    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, rows: validRows }),
      });

      const json = await res.json().catch(() => ({})) as {
        results?: { ok: boolean; message: string }[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? "Import failed");
      }

      const importResults: ImportResult[] = (json.results ?? []).map(
        (r: { ok: boolean; message: string }, i: number) => ({
          index: i + 1,
          ok: r.ok,
          message: r.message,
        })
      );

      setResults(importResults);

      const successCount = importResults.filter((r) => r.ok).length;
      toast.success(`Import complete: ${successCount} / ${importResults.length} succeeded.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const validCount = validatedRows.filter((r) => r.valid).length;
  const errorCount = validatedRows.filter((r) => !r.valid).length;
  const hasParsed = validatedRows.length > 0;

  return (
    <div className="space-y-6">
      {/* Role selector + template download */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Bulk Import Users</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label htmlFor="import-role" className="text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="import-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role);
                setValidatedRows([]);
                setHeaders([]);
                setResults(null);
              }}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download />
            Download Template
          </Button>
        </div>
      </div>

      {/* File upload area */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Upload CSV</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-sm text-gray-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600"
        >
          <Upload className="size-8 text-gray-400" />
          <span className="font-medium">Click to upload a CSV file</span>
          <span className="text-xs text-gray-400">Only .csv files are accepted</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview table */}
      {hasParsed && (
        <div className="rounded-lg border bg-white shadow-sm">
          {/* Table header bar */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-600">{validCount} valid</span>
              {errorCount > 0 && (
                <>
                  {", "}
                  <span className="font-semibold text-red-500">{errorCount} errors</span>
                </>
              )}
            </p>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? "Importing…" : `Import ${validCount} Users`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Status</th>
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validatedRows.map(({ index, row, valid, error }) => (
                  <tr
                    key={index}
                    className={
                      valid
                        ? "border-b last:border-0"
                        : "border-b bg-red-50 last:border-0"
                    }
                  >
                    <td className="px-4 py-2.5 text-gray-400">{index}</td>
                    <td className="px-4 py-2.5">
                      {valid ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <XCircle className="size-4 shrink-0 text-red-500" />
                          <span className="text-xs text-red-600">{error}</span>
                        </span>
                      )}
                    </td>
                    {headers.map((h) => (
                      <td key={h} className="px-4 py-2.5 text-gray-700">
                        {row[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results panel */}
      {results && results.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Import Results</h3>
          <ul className="space-y-2">
            {results.map(({ index, ok, message }) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0 text-gray-400 tabular-nums">#{index}</span>
                <Badge variant={ok ? "default" : "destructive"}>
                  {ok ? "OK" : "Error"}
                </Badge>
                <span className={ok ? "text-gray-700" : "text-red-600"}>{message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
