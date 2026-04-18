import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { AddFeeStructureForm } from "./add-fee-structure-form";

export default async function FeesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feeStructures } = await supabase
    .from("fee_structures")
    .select("id, fee_type, amount, due_date, class:classes(name), academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("order");

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("id, amount_paid, status, payment_date, student:profiles(full_name), fee_structure:fee_structures(fee_type, amount)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const structureRows = (feeStructures ?? []).map((fs) => {
    const cls = (fs.class as unknown as { name: string } | null);
    const ay = (fs.academic_year as unknown as { name: string } | null);
    return {
      id: fs.id,
      fee_type: fs.fee_type,
      amount: `₹${fs.amount}`,
      class_name: cls?.name ?? "—",
      academic_year: ay?.name ?? "—",
      due_date: fs.due_date ?? "—",
    };
  });

  const paymentRows = (payments ?? []).map((p) => {
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Fees</h1>

      <h2 className="mb-4 text-xl font-semibold text-gray-800">Fee Structures</h2>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <AddFeeStructureForm
          schoolId={schoolId}
          classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
          academicYears={(academicYears ?? []).map((y) => ({ id: y.id, name: y.name }))}
        />
      </div>
      <DataTable
        data={structureRows}
        columns={[
          { header: "Fee Type", accessor: "fee_type" },
          { header: "Amount", accessor: "amount" },
          { header: "Class", accessor: "class_name" },
          { header: "Academic Year", accessor: "academic_year" },
          { header: "Due Date", accessor: "due_date" },
        ]}
        emptyMessage="No fee structures yet."
      />

      <h2 className="mb-4 mt-10 text-xl font-semibold text-gray-800">Fee Payments</h2>
      <DataTable
        data={paymentRows}
        columns={[
          { header: "Student", accessor: "student" },
          { header: "Fee Type", accessor: "fee_type" },
          { header: "Amount", accessor: "amount" },
          { header: "Paid", accessor: "paid" },
          { header: "Date", accessor: "date" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge
                variant={
                  row.status === "paid"
                    ? "default"
                    : row.status === "partial"
                    ? "secondary"
                    : "destructive"
                }
              >
                {row.status}
              </Badge>
            ),
          },
        ]}
        emptyMessage="No fee records yet."
      />
    </div>
  );
}
