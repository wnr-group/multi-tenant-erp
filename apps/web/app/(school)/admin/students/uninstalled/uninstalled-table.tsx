"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  parent_phone: string;
  roll_number: string;
  class_name: string;
  section_name: string;
}

export function UninstalledStudentTable({ students }: { students: Student[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPhone(id: string, phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard write failed silently — button stays in default state
    }
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
        All parents have set up the app.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            {["Student", "Class", "Section", "Roll No", "Parent Phone", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.class_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.section_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.roll_number || "—"}</td>
              <td className="px-4 py-3 font-mono text-gray-800">{s.parent_phone}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => copyPhone(s.id, s.parent_phone)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {copiedId === s.id ? (
                    <><Check className="h-3 w-3 text-green-600" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy Number</>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
