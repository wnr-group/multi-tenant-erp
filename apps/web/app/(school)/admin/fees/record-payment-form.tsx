"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface StudentOption {
  id: string;
  name: string;
  classId: string;
}

interface FeeStructureOption {
  id: string;
  feeType: string;
  amount: number;
  classId: string;
}

interface RecordPaymentFormProps {
  schoolId: string;
  students: StudentOption[];
  feeStructures: FeeStructureOption[];
}

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
];

export function RecordPaymentForm({
  schoolId,
  students,
  feeStructures,
}: RecordPaymentFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId);
  const filteredFeeStructures = selectedStudent
    ? feeStructures.filter((fs) => fs.classId === selectedStudent.classId)
    : [];

  // Reset fee structure when student changes
  function handleStudentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStudentId(e.target.value);
    setFeeStructureId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!studentId || !feeStructureId || !paymentMethod) {
      setLoading(false);
      return;
    }

    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid <= 0) {
      setError("Please enter a valid amount.");
      setLoading(false);
      return;
    }

    const selectedStructure = feeStructures.find((fs) => fs.id === feeStructureId);
    if (!selectedStructure) {
      setLoading(false);
      return;
    }

    const structureAmount = selectedStructure.amount;
    const status =
      paid >= structureAmount
        ? "paid"
        : paid > 0
        ? "partial"
        : "overdue";
    const supabase = createClient();
    const { error: insertError } = await supabase.from("fee_payments").insert({
      school_id: schoolId,
      student_id: studentId,
      fee_structure_id: feeStructureId,
      amount_paid: paid,
      payment_method: paymentMethod,
      receipt_number: receiptNumber || null,
      payment_date: new Date().toISOString().split("T")[0],
      status,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setStudentId("");
    setFeeStructureId("");
    setAmountPaid("");
    setPaymentMethod("");
    setReceiptNumber("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <Label>Student</Label>
        <NativeSelect
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={studentId}
          onChange={handleStudentChange}
          placeholder="Select student"
        />
      </div>
      <div className="w-52">
        <Label>Fee Structure</Label>
        <NativeSelect
          options={filteredFeeStructures.map((fs) => ({
            value: fs.id,
            label: `${fs.feeType} — ₹${fs.amount}`,
          }))}
          value={feeStructureId}
          onChange={(e) => setFeeStructureId(e.target.value)}
          placeholder={studentId ? "Select fee structure" : "Select student first"}
          disabled={!studentId}
        />
      </div>
      <div className="w-36">
        <Label>Amount Paid (₹)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          placeholder="0"
          required
        />
      </div>
      <div className="w-40">
        <Label>Payment Method</Label>
        <NativeSelect
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="Select method"
        />
      </div>
      <div className="w-40">
        <Label>Receipt No. (optional)</Label>
        <Input
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
          placeholder="RCP-001"
        />
      </div>
      <div className="flex flex-col gap-1">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || !studentId || !feeStructureId || !paymentMethod}>
          {loading ? "Recording…" : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}
