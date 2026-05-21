"use client";

import { useState } from "react";
import { RecordPaymentForm } from "@/app/(school)/teacher/fees/record-payment-form";
import { FeesPieChart } from "./student-fees-pie-chart";

interface FeeRow {
  feeStructureId: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  concessionTotal: number;
  status: string;
}

interface Props {
  rows: FeeRow[];
  schoolId: string;
  studentId: string;
  studentName: string;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid" ? "bg-emerald-100 text-emerald-800" :
    status === "partial" ? "bg-amber-100 text-amber-800" :
    "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

export function StudentFeesClient({ rows, schoolId, studentId, studentName }: Props) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  const totalDue = rows.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = rows.reduce((s, r) => s + r.amountPaid + r.concessionTotal, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return (
    <div className="space-y-4">
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={studentId}
          studentName={studentName}
          feeStructureId={payingFor.feeStructureId}
          amountDue={payingFor.amountDue}
          amountPaid={payingFor.amountPaid}
          concessionTotal={payingFor.concessionTotal}
          onClose={() => setPayingFor(null)}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Due", value: `₹${totalDue.toLocaleString("en-IN")}`, color: "text-foreground" },
          { label: "Paid", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "text-emerald-600" },
          { label: "Outstanding", value: `₹${outstanding.toLocaleString("en-IN")}`, color: outstanding > 0 ? "text-rose-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <FeesPieChart totalPaid={totalPaid} outstanding={outstanding} />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Fee Type", "Due (₹)", "Paid (₹)", "Concession (₹)", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No fee structures assigned to this student&apos;s class.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.feeStructureId} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.feeType}</td>
                <td className="px-4 py-3 tabular-nums">{row.amountDue.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums">{row.amountPaid.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums">{row.concessionTotal > 0 ? row.concessionTotal.toLocaleString("en-IN") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  {row.status !== "paid" && (
                    <button onClick={() => setPayingFor(row)} className="text-sm font-medium text-blue-600 hover:underline">
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
