import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

export default async function FeesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("id, amount_paid, status, payment_date, student:profiles(full_name), fee_structure:fee_structures(fee_type, amount)")
    .eq("school_id", profile!.school_id!)
    .order("created_at", { ascending: false });

  const rows = (payments ?? []).map((p) => {
    const student = (p.student as unknown as { full_name: string } | null);
    const feeStruct = (p.fee_structure as unknown as { fee_type: string; amount: number } | null);
    return {
      id: p.id,
      student: student?.full_name ?? "",
      fee_type: feeStruct?.fee_type ?? "",
      amount: `₹${feeStruct?.amount ?? 0}`,
      paid: `₹${p.amount_paid}`,
      date: p.payment_date ?? "—",
      status: p.status,
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Fee Payments</h1>
      <DataTable data={rows} columns={[
        { header: "Student", accessor: "student" },
        { header: "Fee Type", accessor: "fee_type" },
        { header: "Amount", accessor: "amount" },
        { header: "Paid", accessor: "paid" },
        { header: "Date", accessor: "date" },
        { header: "Status", accessor: (row) => (
          <Badge variant={row.status === "paid" ? "default" : row.status === "partial" ? "secondary" : "destructive"}>{row.status}</Badge>
        )},
      ]} emptyMessage="No fee records yet." />
    </div>
  );
}
