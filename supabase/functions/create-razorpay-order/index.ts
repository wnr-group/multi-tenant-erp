import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { feeStructureId, studentId } = (await req.json()) as {
      feeStructureId: string;
      studentId: string;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: feeStructure, error: fsError } = await supabase
      .from("fee_structures")
      .select("id, amount, school_id, fee_type")
      .eq("id", feeStructureId)
      .single();

    if (fsError || !feeStructure) {
      return new Response(
        JSON.stringify({ error: "Fee structure not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: existingPayments } = await supabase
      .from("fee_payments")
      .select("amount_paid")
      .eq("student_id", studentId)
      .eq("fee_structure_id", feeStructureId)
      .in("status", ["paid", "partial"]);

    const alreadyPaid = (existingPayments ?? []).reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0
    );
    const remaining = Math.max(0, Number(feeStructure.amount) - alreadyPaid);

    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ error: "Fee already fully paid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const amountInPaise = Math.round(remaining * 100);
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `fee_${feeStructureId}_${studentId}`.slice(0, 40),
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      return new Response(
        JSON.stringify({ error: "Razorpay order failed", detail: errBody }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const razorpayOrder = (await razorpayRes.json()) as {
      id: string;
      amount: number;
      currency: string;
    };

    const { data: feePayment, error: insertError } = await supabase
      .from("fee_payments")
      .insert({
        school_id: feeStructure.school_id,
        student_id: studentId,
        fee_structure_id: feeStructureId,
        amount_paid: 0,
        status: "overdue",
        razorpay_order_id: razorpayOrder.id,
      })
      .select("id")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        feePaymentId: feePayment?.id,
        feeType: feeStructure.fee_type,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
