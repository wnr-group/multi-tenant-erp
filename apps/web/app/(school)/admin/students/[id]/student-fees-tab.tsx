import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentFeesClient } from "./student-fees-client";
import type { FeeType } from "@/components/fee-type-select";

interface Props {
  studentId: string;
  studentName: string;
}

export async function StudentFeesTab({ studentId, studentName }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [lineItemsRes, paymentsRes, feeTypesRes] = await Promise.all([
    supabase
      .from("fee_line_items")
      .select("id, fee_type:fee_types(name), total_amount, due_date, status, created_at, added_by_profile:profiles!added_by(full_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, payment_date, total_amount, payment_method, mode, transaction_id, razorpay_payment_id, notes, paid_by_profile:profiles!paid_by_profile_id(full_name), line_item_payments(line_item_id, amount_applied, fee_line_items!line_item_id(fee_type:fee_types(name)))")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("fee_types")
      .select("id, name, category, is_predefined")
      .or(`school_id.eq.${schoolId},school_id.is.null`)
      .order("is_predefined", { ascending: false })
      .order("name"),
  ]);

  const lipByLineItem: Record<string, number> = {};
  for (const p of paymentsRes.data ?? []) {
    for (const lip of (p as any).line_item_payments ?? []) {
      lipByLineItem[lip.line_item_id] = (lipByLineItem[lip.line_item_id] ?? 0) + lip.amount_applied;
    }
  }

  const lineItems = (lineItemsRes.data ?? []).map((li: any) => ({
    id: li.id,
    fee_type: (li.fee_type as { name?: string } | null)?.name ?? "—",
    total_amount: Number(li.total_amount),
    amount_paid: lipByLineItem[li.id] ?? 0,
    due_date: li.due_date ?? null,
    status: li.status,
    created_at: li.created_at,
    added_by: (li.added_by_profile as { full_name?: string } | null)?.full_name ?? "—",
  }));

  const payments = (paymentsRes.data ?? []).map((p: any) => ({
    id: p.id,
    payment_date: p.payment_date,
    total_amount: Number(p.total_amount),
    payment_method: p.payment_method,
    mode: p.mode,
    transaction_id: p.transaction_id ?? null,
    razorpay_payment_id: p.razorpay_payment_id ?? null,
    notes: p.notes ?? null,
    paid_by: (p.paid_by_profile as { full_name?: string } | null)?.full_name ?? "—",
    line_items_covered: ((p.line_item_payments ?? []) as any[]).map((lip) => ({
      line_item_id: lip.line_item_id,
      fee_type: (lip.fee_line_items as { fee_type?: { name?: string } } | null)?.fee_type?.name ?? "—",
      amount_applied: lip.amount_applied,
    })),
  }));

  return (
    <StudentFeesClient
      lineItems={lineItems}
      payments={payments}
      schoolId={schoolId}
      studentId={studentId}
      studentName={studentName}
      feeTypes={(feeTypesRes.data ?? []) as FeeType[]}
    />
  );
}
