"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

interface Props {
  schoolId: string;
  studentId: string;
  studentName: string;
  feeStructureId: string;
  amountDue: number;
  amountPaid: number;
  onClose: () => void;
}

export function RecordPaymentForm({
  schoolId,
  studentId,
  studentName,
  feeStructureId,
  amountDue,
  amountPaid,
  onClose,
}: Props) {
  const router = useRouter();
  const remaining = amountDue - amountPaid;
  const [amount, setAmount] = useState(String(remaining > 0 ? remaining : 0));
  const [method, setMethod] = useState("cash");
  const [receiptNo, setReceiptNo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const totalAfterPayment = amountPaid + parsedAmount;
    const status = totalAfterPayment >= amountDue ? "paid" : "partial";

    const { error } = await supabase.from("fee_payments").insert({
      school_id: schoolId,
      student_id: studentId,
      fee_structure_id: feeStructureId,
      amount_paid: parsedAmount,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: method,
      receipt_no: receiptNo || null,
      status,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Payment of ₹${parsedAmount} recorded for ${studentName}.`);
    onClose();
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Record Payment — {studentName}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Remaining: ₹{remaining.toLocaleString("en-IN")}
      </p>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div>
          <Label>Amount (₹)</Label>
          <Input
            type="number"
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Payment Method</Label>
          <NativeSelect
            options={PAYMENT_METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <Label>Receipt # (optional)</Label>
          <Input
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
            placeholder="e.g., RCP-2024-001"
          />
        </div>

        <div className="flex items-end sm:col-span-2">
          <Button type="submit" disabled={loading || !amount}>
            {loading ? "Saving…" : "Save Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
