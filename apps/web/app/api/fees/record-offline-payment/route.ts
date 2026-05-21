import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface LineItemAllocation {
  line_item_id: string;
  amount_applied: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, school_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["school_admin", "teacher"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  if (roleRow.school_id !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    student_id: string;
    payment_method: string;
    transaction_id?: string;
    notes?: string;
    allocations: LineItemAllocation[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.student_id || !body.allocations?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const totalAmount = body.allocations.reduce((s, a) => s + a.amount_applied, 0);

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert payment record
  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .insert({
      school_id: schoolId,
      student_id: body.student_id,
      paid_by_profile_id: user.id,
      total_amount: totalAmount,
      payment_method: body.payment_method ?? "cash",
      mode: "offline",
      transaction_id: body.transaction_id ?? null,
      notes: body.notes ?? null,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? "Payment insert failed" }, { status: 500 });
  }

  // Insert line_item_payments
  const lipRows = body.allocations.map((a) => ({
    payment_id: payment.id,
    line_item_id: a.line_item_id,
    amount_applied: a.amount_applied,
  }));

  const { error: lipError } = await adminClient
    .from("line_item_payments")
    .insert(lipRows);

  if (lipError) {
    return NextResponse.json({ error: lipError.message }, { status: 500 });
  }

  // Recompute status for each affected line item
  for (const a of body.allocations) {
    const { data: li } = await adminClient
      .from("fee_line_items")
      .select("total_amount")
      .eq("id", a.line_item_id)
      .single();

    if (!li) continue;

    const { data: allLip } = await adminClient
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", a.line_item_id);

    const totalPaid = (allLip ?? []).reduce((s: number, r: { amount_applied: number }) => s + (r.amount_applied ?? 0), 0);
    const status = totalPaid >= li.total_amount ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await adminClient
      .from("fee_line_items")
      .update({ status })
      .eq("id", a.line_item_id);
  }

  return NextResponse.json({ payment_id: payment.id });
}
