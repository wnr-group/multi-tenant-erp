import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

async function verifySignature(
  body: string,
  signature: string
): Promise<boolean> {
  const key = new TextEncoder().encode(RAZORPAY_WEBHOOK_SECRET);
  const data = new TextEncoder().encode(body);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
  const expected = Array.from(sig)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const valid = await verifySignature(body, signature);
  if (!valid) {
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = JSON.parse(body) as {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          amount: number;
          currency: string;
          status: string;
          method: string;
        };
      };
    };
  };

  if (payload.event !== "payment.captured") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payment = payload.payload.payment.entity;
  const orderId = payment.order_id;
  const amountPaid = payment.amount / 100;
  const razorpayPaymentId = payment.id;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: feePayment, error: findError } = await supabase
    .from("fee_payments")
    .select("id, fee_structure_id")
    .eq("razorpay_order_id", orderId)
    .single();

  if (findError || !feePayment) {
    return new Response(
      JSON.stringify({ error: "Fee payment record not found for order" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: feeStructure } = await supabase
    .from("fee_structures")
    .select("amount")
    .eq("id", feePayment.fee_structure_id)
    .single();

  const totalAmount = Number(feeStructure?.amount ?? 0);
  const status = amountPaid >= totalAmount ? "paid" : "partial";

  const { error: updateError } = await supabase
    .from("fee_payments")
    .update({
      amount_paid: amountPaid,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "razorpay",
      receipt_number: razorpayPaymentId,
      status,
    })
    .eq("id", feePayment.id);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: updateError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, feePaymentId: feePayment.id, status }),
    { headers: { "Content-Type": "application/json" } }
  );
});
