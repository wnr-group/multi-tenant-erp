import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is a parent
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    amount_paise: number;
    student_id: string;
    line_item_ids: string[];
    receipt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.amount_paise !== "number" ||
    body.amount_paise <= 0 ||
    !isFinite(body.amount_paise) ||
    !body.student_id ||
    !body.line_item_ids?.length
  ) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  // Verify this student belongs to the authenticated user (parent)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: sp } = await adminClient
    .from("student_profiles")
    .select("parent_profile_id")
    .eq("id", body.student_id)
    .single();

  if (!sp || sp.parent_profile_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(body.amount_paise),
    currency: "INR",
    receipt: body.receipt ?? `rcpt_${Date.now()}`,
    notes: {
      student_id: body.student_id,
      line_item_ids: body.line_item_ids.join(","),
    },
  });

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}
