"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeesPieChart } from "./student-fees-pie-chart";

interface LineItem {
  id: string;
  fee_type: string;
  total_amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  created_at: string;
  added_by: string;
}

interface PaymentRecord {
  id: string;
  payment_date: string;
  total_amount: number;
  payment_method: string;
  mode: string;
  transaction_id: string | null;
  razorpay_payment_id: string | null;
  notes: string | null;
  paid_by: string;
  line_items_covered: { line_item_id: string; fee_type: string; amount_applied: number }[];
}

interface Props {
  lineItems: LineItem[];
  payments: PaymentRecord[];
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

export function StudentFeesClient({ lineItems, payments, schoolId: _schoolId, studentId, studentName: _studentName }: Props) {
  const router = useRouter();
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [recordingFor, setRecordingFor] = useState<LineItem | null>(null);
  const [offlineForm, setOfflineForm] = useState({
    amount: "",
    payment_method: "cash",
    transaction_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const totalDue = lineItems.reduce((s, li) => s + li.total_amount, 0);
  const totalPaid = lineItems.reduce((s, li) => s + li.amount_paid, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  async function handleRecordOffline(lineItem: LineItem) {
    setSaveError("");
    const amountNum = parseFloat(offlineForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) { setSaveError("Enter a valid amount."); return; }
    const pending = lineItem.total_amount - lineItem.amount_paid;
    if (amountNum > pending) { setSaveError(`Amount cannot exceed outstanding ₹${pending.toLocaleString("en-IN")}.`); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/fees/record-offline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          payment_method: offlineForm.payment_method,
          transaction_id: offlineForm.transaction_id || undefined,
          notes: offlineForm.notes || undefined,
          allocations: [{ line_item_id: lineItem.id, amount_applied: amountNum }],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to record payment."); return; }
      setRecordingFor(null);
      setOfflineForm({ amount: "", payment_method: "cash", transaction_id: "", notes: "" });
      router.refresh();
    } catch {
      setSaveError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary + Pie */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
        <FeesPieChart totalPaid={totalPaid} outstanding={outstanding} />
      </div>

      {/* Line Items Table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fee Line Items</h3>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Fee Type", "Total (₹)", "Paid (₹)", "Due Date", "Status", "Added By", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineItems.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No fee line items yet.</td></tr>
              ) : lineItems.map((li) => (
                <>
                  <tr key={li.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-indigo-600 hover:underline"
                        onClick={() => setSelectedLineItem(selectedLineItem?.id === li.id ? null : li)}
                      >
                        {li.fee_type}
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{li.total_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">{li.amount_paid.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{li.due_date ? new Date(li.due_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={li.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{li.added_by}</td>
                    <td className="px-4 py-3">
                      {li.status !== "paid" && (
                        <button
                          onClick={() => { setRecordingFor(recordingFor?.id === li.id ? null : li); setSaveError(""); }}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>

                  {selectedLineItem?.id === li.id && (
                    <tr key={`${li.id}-detail`}>
                      <td colSpan={7} className="bg-indigo-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Line Item Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Fee Type:</span> {li.fee_type}</div>
                          <div><span className="text-muted-foreground">Total Amount:</span> ₹{li.total_amount.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Amount Paid:</span> ₹{li.amount_paid.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Pending:</span> ₹{(li.total_amount - li.amount_paid).toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Due Date:</span> {li.due_date ?? "—"}</div>
                          <div><span className="text-muted-foreground">Status:</span> {li.status}</div>
                          <div><span className="text-muted-foreground">Added By:</span> {li.added_by}</div>
                          <div><span className="text-muted-foreground">Created:</span> {new Date(li.created_at).toLocaleDateString("en-IN")}</div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {recordingFor?.id === li.id && (
                    <tr key={`${li.id}-record`}>
                      <td colSpan={7} className="bg-blue-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">Record Offline Payment</p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Amount (₹)</label>
                            <input
                              type="number" min={1} max={li.total_amount - li.amount_paid}
                              value={offlineForm.amount}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, amount: e.target.value }))}
                              className="mt-0.5 block w-28 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder={String(li.total_amount - li.amount_paid)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Method</label>
                            <select
                              value={offlineForm.payment_method}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, payment_method: e.target.value }))}
                              className="mt-0.5 block rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                            >
                              {["cash", "upi", "bank_transfer", "cheque"].map((m) => (
                                <option key={m} value={m}>{m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Transaction / Receipt ID</label>
                            <input
                              type="text"
                              value={offlineForm.transaction_id}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, transaction_id: e.target.value }))}
                              className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Notes</label>
                            <input
                              type="text"
                              value={offlineForm.notes}
                              onChange={(e) => setOfflineForm((f) => ({ ...f, notes: e.target.value }))}
                              className="mt-0.5 block w-36 rounded-md border border-input bg-white px-3 py-1.5 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <button
                            onClick={() => handleRecordOffline(li)}
                            disabled={saving}
                            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setRecordingFor(null)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                        {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Transactions Table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Transactions</h3>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Amount (₹)", "Method", "Mode", "Paid By", "Transaction ID", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payment transactions yet.</td></tr>
              ) : payments.map((p) => (
                <>
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-emerald-700">₹{p.total_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.mode === "online" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.paid_by}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.transaction_id ?? p.razorpay_payment_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-sm font-medium text-indigo-600 hover:underline"
                        onClick={() => setSelectedPayment(selectedPayment?.id === p.id ? null : p)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>

                  {selectedPayment?.id === p.id && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={7} className="bg-indigo-50 px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Payment Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div><span className="text-muted-foreground">Date:</span> {new Date(p.payment_date).toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Total Amount:</span> ₹{p.total_amount.toLocaleString("en-IN")}</div>
                          <div><span className="text-muted-foreground">Method:</span> {p.payment_method.replace("_", " ")}</div>
                          <div><span className="text-muted-foreground">Mode:</span> {p.mode}</div>
                          <div><span className="text-muted-foreground">Paid By:</span> {p.paid_by}</div>
                          <div><span className="text-muted-foreground">Transaction ID:</span> {p.transaction_id ?? "—"}</div>
                          {p.razorpay_payment_id && (
                            <div><span className="text-muted-foreground">Razorpay ID:</span> {p.razorpay_payment_id}</div>
                          )}
                          {p.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {p.notes}</div>}
                        </div>
                        {p.line_items_covered.length > 0 && (
                          <>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Applied to:</p>
                            <ul className="space-y-0.5">
                              {p.line_items_covered.map((lic, i) => (
                                <li key={i} className="text-sm flex justify-between max-w-xs">
                                  <span>{lic.fee_type}</span>
                                  <span className="font-medium text-emerald-700">₹{lic.amount_applied.toLocaleString("en-IN")}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
