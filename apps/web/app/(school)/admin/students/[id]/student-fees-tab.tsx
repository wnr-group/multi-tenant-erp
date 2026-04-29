import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentFeesClient } from "./student-fees-client";

interface Props {
  studentId: string;
  studentName: string;
}

export async function StudentFeesTab({ studentId, studentName }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Get student's class to find fee structures
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("class_id")
    .eq("id", studentId)
    .single();

  const { data: feeStructures } = await supabase
    .from("fee_structures")
    .select("id, fee_type, amount")
    .eq("school_id", schoolId)
    .eq("class_id", sp?.class_id ?? "00000000-0000-0000-0000-000000000000");

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("fee_structure_id, amount_paid, concession_amount")
    .eq("student_id", studentId)
    .eq("school_id", schoolId);

  const paidMap = new Map<string, number>();
  const concessionMap = new Map<string, number>();
  const installmentCountMap = new Map<string, number>();
  for (const p of payments ?? []) {
    paidMap.set(p.fee_structure_id, (paidMap.get(p.fee_structure_id) ?? 0) + (p.amount_paid ?? 0));
    concessionMap.set(p.fee_structure_id, (concessionMap.get(p.fee_structure_id) ?? 0) + (p.concession_amount ?? 0));
    installmentCountMap.set(p.fee_structure_id, (installmentCountMap.get(p.fee_structure_id) ?? 0) + 1);
  }

  const rows = (feeStructures ?? []).map((fs) => {
    const unitAmount = fs.amount as number;
    // Total due = per-installment amount × number of billing periods raised for this student
    const installments = Math.max(1, installmentCountMap.get(fs.id) ?? 0);
    const amountDue = unitAmount * installments;
    const amountPaid = paidMap.get(fs.id) ?? 0;
    const concessionTotal = concessionMap.get(fs.id) ?? 0;
    const effective = amountPaid + concessionTotal;
    const status = effective >= amountDue ? "paid" : effective > 0 ? "partial" : "pending";
    return { feeStructureId: fs.id, feeType: fs.fee_type as string, amountDue, amountPaid, concessionTotal, status };
  });

  return (
    <StudentFeesClient
      rows={rows}
      schoolId={schoolId}
      studentId={studentId}
      studentName={studentName}
    />
  );
}
