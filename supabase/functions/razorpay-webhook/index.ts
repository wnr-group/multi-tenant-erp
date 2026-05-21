import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const valid = await verifySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.event !== "payment.captured") {
    return new Response("Ignored", { status: 200 });
  }

  const paymentEntity = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown>;
  const payment = paymentEntity?.entity as Record<string, unknown>;
  if (!payment) return new Response("Bad payload", { status: 400 });

  const orderId = String(payment.order_id ?? "");
  const paymentId = String(payment.id ?? "");
  const amountPaise = Number(payment.amount ?? 0);
  const notes = (payment.notes ?? {}) as Record<string, string>;

  const studentId = notes.student_id ?? "";
  const lineItemIds = (notes.line_item_ids ?? "").split(",").filter(Boolean);

  if (!studentId || lineItemIds.length === 0) {
    return new Response("Missing notes", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Idempotency check
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("razorpay_payment_id", paymentId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  // Get student's school_id
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("school_id, parent_profile_id")
    .eq("id", studentId)
    .single();

  if (!sp) return new Response("Student not found", { status: 404 });

  const totalAmount = amountPaise / 100;

  // Insert payment record
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .insert({
      school_id: sp.school_id,
      student_id: studentId,
      paid_by_profile_id: sp.parent_profile_id,
      total_amount: totalAmount,
      payment_method: "online",
      mode: "online",
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      transaction_id: paymentId,
    })
    .select("id")
    .single();

  if (payErr || !paymentRow) {
    console.error("Payment insert error:", payErr);
    return new Response("Payment insert failed", { status: 500 });
  }

  // Fetch line items to compute amount per item
  const { data: lineItems } = await supabase
    .from("fee_line_items")
    .select("id, total_amount")
    .in("id", lineItemIds);

  for (const li of lineItems ?? []) {
    const { data: existingLip } = await supabase
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", li.id);

    const alreadyPaid = (existingLip ?? []).reduce(
      (s: number, r: { amount_applied: number }) => s + (r.amount_applied ?? 0),
      0
    );
    const amountToApply = Math.max(0, Number(li.total_amount) - alreadyPaid);
    if (amountToApply <= 0) continue;

    await supabase.from("line_item_payments").insert({
      payment_id: paymentRow.id,
      line_item_id: li.id,
      amount_applied: amountToApply,
    });

    // Recompute status
    const { data: allLip } = await supabase
      .from("line_item_payments")
      .select("amount_applied")
      .eq("line_item_id", li.id);

    const totalPaid = (allLip ?? []).reduce(
      (s: number, r: { amount_applied: number }) => s + (r.amount_applied ?? 0),
      0
    );
    const status = totalPaid >= Number(li.total_amount) ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await supabase.from("fee_line_items").update({ status }).eq("id", li.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
