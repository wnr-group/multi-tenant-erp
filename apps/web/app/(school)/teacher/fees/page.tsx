import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";
import { FeesTable, type FeeRow } from "./fees-table";

export default async function TeacherFeesPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Get the class for this section
  const { data: sectionRow } = await supabase
    .from("sections")
    .select("id, name, class_id, class:classes(name)")
    .eq("id", sectionId)
    .single();

  const classId = sectionRow?.class_id as string | undefined;
  const sec = sectionRow as unknown as {
    name: string;
    class_id: string;
    class: { name: string } | null;
  } | null;
  const sectionLabel = sec ? `${sec.class?.name ?? ""} – Section ${sec.name}` : "";

  // Fetch fee structures for the class
  const { data: feeStructures } = await supabase
    .from("fee_structures")
    .select("id, fee_type, amount")
    .eq("school_id", schoolId)
    .eq("class_id", classId ?? "00000000-0000-0000-0000-000000000000");

  // Fetch students in this section
  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("section_id", sectionId)
    .order("full_name");

  const studentMap = new Map<string, string>();
  for (const sp of students ?? []) {
    studentMap.set(sp.id, sp.full_name ?? "—");
  }

  const studentIds = Array.from(studentMap.keys());

  // Fetch all fee payments for these students
  const { data: payments } = await supabase
    .from("fee_payments")
    .select("student_id, fee_structure_id, amount_paid, concession_amount")
    .eq("school_id", schoolId)
    .in(
      "student_id",
      studentIds.length > 0
        ? studentIds
        : ["00000000-0000-0000-0000-000000000000"]
    );

  // Build lookups: studentId + feeStructureId → totalPaid / totalConcession / installment count
  const paidMap = new Map<string, number>();
  const concessionMap = new Map<string, number>();
  const installmentCountMap = new Map<string, number>();
  for (const p of payments ?? []) {
    const key = `${p.student_id}::${p.fee_structure_id}`;
    paidMap.set(key, (paidMap.get(key) ?? 0) + (p.amount_paid ?? 0));
    concessionMap.set(key, (concessionMap.get(key) ?? 0) + (p.concession_amount ?? 0));
    installmentCountMap.set(key, (installmentCountMap.get(key) ?? 0) + 1);
  }

  // Build rows: one per student × fee structure
  const rows: FeeRow[] = [];
  for (const [studentId, studentName] of studentMap) {
    for (const fs of feeStructures ?? []) {
      const key = `${studentId}::${fs.id}`;
      const unitAmount = (fs.amount as number) ?? 0;
      // Total due = per-installment amount × number of billing periods raised for this student
      const installments = Math.max(1, installmentCountMap.get(key) ?? 0);
      const amountDue = unitAmount * installments;
      const amountPaid = paidMap.get(key) ?? 0;
      const concessionTotal = concessionMap.get(key) ?? 0;
      const effectivePaid = amountPaid + concessionTotal;
      const status =
        effectivePaid >= amountDue
          ? "paid"
          : amountPaid > 0 || concessionTotal > 0
            ? "partial"
            : "pending";
      rows.push({
        studentId,
        studentName,
        feeStructureId: fs.id,
        feeType: (fs.fee_type as string) ?? "—",
        amountDue,
        amountPaid,
        concessionTotal,
        status,
      });
    }
  }

  // Sort: by student name, then fee type
  rows.sort((a, b) =>
    a.studentName.localeCompare(b.studentName) ||
    a.feeType.localeCompare(b.feeType)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
        {sectionLabel && (
          <p className="mt-1 text-sm text-gray-500">{sectionLabel}</p>
        )}
      </div>

      <FeesTable rows={rows} schoolId={schoolId} />
    </div>
  );
}
