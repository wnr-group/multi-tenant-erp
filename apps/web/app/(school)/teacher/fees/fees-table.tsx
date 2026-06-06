"use client";

import { useState } from "react";
import { RecordPaymentForm } from "./record-payment-form";

export interface FeeRow {
  lineItemId: string;
  studentId: string;
  studentName: string;
  feeTypeName: string;
  totalAmount: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "partial"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
}

export function FeesTable({ rows, schoolId }: { rows: FeeRow[]; schoolId: string }) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  return (
    <div>
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={payingFor.studentId}
          studentName={payingFor.studentName}
          lineItemId={payingFor.lineItemId}
          feeTypeName={payingFor.feeTypeName}
          totalAmount={payingFor.totalAmount}
          amountPaid={payingFor.amountPaid}
          onClose={() => setPayingFor(null)}
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Student", "Fee Type", "Due (₹)", "Paid (₹)", "Due Date", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No fee line items for this section yet.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.lineItemId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.feeTypeName}</td>
                <td className="px-4 py-3 tabular-nums">{row.totalAmount.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{row.amountPaid.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  {row.status !== "paid" && (
                    <button
                      onClick={() => setPayingFor(row)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
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
