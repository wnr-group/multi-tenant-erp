"use client";

import { useState } from "react";
import { RecordPaymentForm } from "./record-payment-form";

export interface FeeRow {
  studentId: string;
  studentName: string;
  feeStructureId: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "partial"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}

interface Props {
  rows: FeeRow[];
  schoolId: string;
}

export function FeesTable({ rows, schoolId }: Props) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  return (
    <div>
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={payingFor.studentId}
          studentName={payingFor.studentName}
          feeStructureId={payingFor.feeStructureId}
          amountDue={payingFor.amountDue}
          amountPaid={payingFor.amountPaid}
          onClose={() => setPayingFor(null)}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Student
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Fee Type
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Due (₹)
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Paid (₹)
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No fee records for this section.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.studentId}-${row.feeStructureId}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.studentName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.feeType}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.amountDue.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.amountPaid.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => setPayingFor(row)}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
