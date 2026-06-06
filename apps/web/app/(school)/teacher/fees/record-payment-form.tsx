"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  schoolId: string;
  studentId: string;
  studentName: string;
  lineItemId: string;
  feeTypeName: string;
  totalAmount: number;
  amountPaid: number;
  onClose: () => void;
}

const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque"] as const;
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", cheque: "Cheque",
};

export function RecordPaymentForm({
  studentId,
  studentName,
  lineItemId,
  feeTypeName,
  totalAmount,
  amountPaid,
  onClose,
}: Props) {
  const router = useRouter();
  const pending = totalAmount - amountPaid;
  const [amount, setAmount] = useState(String(pending));
  const [method, setMethod] = useState("cash");
  const [txId, setTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("Enter a valid amount."); return; }
    if (amountNum > pending) { toast.error(`Amount cannot exceed outstanding ₹${pending.toLocaleString("en-IN")}.`); return; }

    setLoading(true);
    const res = await fetch("/api/fees/record-offline-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        payment_method: method,
        transaction_id: txId || undefined,
        notes: notes || undefined,
        allocations: [{ line_item_id: lineItemId, amount_applied: amountNum }],
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Failed to record payment."); return; }
    toast.success("Payment recorded.");
    router.refresh();
    onClose();
  }

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
        Record Payment — {studentName}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        {feeTypeName} · Outstanding ₹{pending.toLocaleString("en-IN")}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Amount (₹) *</label>
          <input
            type="number" min={1} max={pending}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-0.5 block w-28 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-0.5 block rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Receipt / Txn ID</label>
          <input
            type="text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="Optional"
            className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </form>
    </div>
  );
}
