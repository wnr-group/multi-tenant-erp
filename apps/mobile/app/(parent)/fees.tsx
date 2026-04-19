import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";

interface FeeRow {
  id: string;
  feeStructureId: string;
  feeType: string;
  amount: number;
  paid: number;
  status: string;
  dueDate: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "text-green-600",
  partial: "text-yellow-600",
  overdue: "text-red-600",
};

const SUPABASE_URL = (Constants.expoConfig?.extra?.supabaseUrl as string) ?? "";
const RAZORPAY_KEY_ID = (Constants.expoConfig?.extra?.razorpayKeyId as string) ?? "";

export default function ParentFees() {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    email: string;
    phone: string | null;
    full_name: string;
  } | null>(null);

  const loadFees = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();
    setProfile(p);

    const { data: sp } = await supabase
      .from("student_profiles")
      .select("class_id, school_id")
      .eq("profile_id", user.id)
      .single();

    if (!sp) {
      setLoading(false);
      return;
    }

    const { data: structures } = await supabase
      .from("fee_structures")
      .select("id, fee_type, amount, due_date")
      .eq("school_id", sp.school_id)
      .eq("class_id", sp.class_id);

    const { data: payments } = await supabase
      .from("fee_payments")
      .select("fee_structure_id, amount_paid, status")
      .eq("student_id", user.id);

    const paymentMap = new Map<string, { paid: number; status: string }>();
    for (const pay of payments ?? []) {
      const existing = paymentMap.get(pay.fee_structure_id);
      const paid = Number(pay.amount_paid);
      if (!existing || pay.status === "paid") {
        paymentMap.set(pay.fee_structure_id, { paid, status: pay.status });
      }
    }

    const rows: FeeRow[] = (structures ?? []).map((fs) => {
      const payment = paymentMap.get(fs.id);
      return {
        id: fs.id,
        feeStructureId: fs.id,
        feeType: fs.fee_type,
        amount: Number(fs.amount),
        paid: payment?.paid ?? 0,
        status: payment?.status ?? "overdue",
        dueDate: fs.due_date,
      };
    });

    setFees(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  async function handlePayNow(fee: FeeRow) {
    setPaying(fee.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            feeStructureId: fee.feeStructureId,
            studentId: user.id,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Could not create order");
        setPaying(null);
        return;
      }

      const order = (await res.json()) as {
        orderId: string;
        amount: number;
        currency: string;
        feeType: string;
      };

      const options = {
        description: order.feeType,
        currency: order.currency,
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        order_id: order.orderId,
        name: "School Fee Payment",
        prefill: {
          email: profile?.email ?? "",
          contact: profile?.phone ?? "",
          name: profile?.full_name ?? "",
        },
        theme: { color: "#2563EB" },
      };

      const paymentData = await RazorpayCheckout.open(options);
      Alert.alert(
        "Payment Successful",
        `Payment ID: ${paymentData.razorpay_payment_id}`
      );

      setTimeout(() => { loadFees(); }, 2000);
    } catch (error: unknown) {
      const err = error as { description?: string; code?: number };
      if (err.code === 2) {
        Alert.alert("Cancelled", "Payment was cancelled.");
      } else {
        Alert.alert("Payment Failed", err.description ?? "Something went wrong");
      }
    } finally {
      setPaying(null);
    }
  }

  if (loading) return <ActivityIndicator className="flex-1 mt-20" />;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-5">
      <Text className="mt-12 mb-5 text-2xl font-bold text-gray-900">Fees</Text>
      {fees.map((f) => {
        const remaining = f.amount - f.paid;
        const isPaying = paying === f.id;

        return (
          <View key={f.id} className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-medium capitalize text-gray-800">
                {f.feeType}
              </Text>
              <Text
                className={`text-sm font-medium capitalize ${
                  STATUS_COLORS[f.status] ?? "text-gray-600"
                }`}
              >
                {f.status}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-gray-500">
              ₹{f.paid} paid of ₹{f.amount}
              {f.dueDate ? ` · Due: ${f.dueDate}` : ""}
            </Text>
            {f.status !== "paid" && remaining > 0 && (
              <TouchableOpacity
                onPress={() => handlePayNow(f)}
                disabled={isPaying}
                className="mt-3 rounded-lg bg-blue-600 py-2.5 disabled:opacity-50"
              >
                <Text className="text-center text-sm font-medium text-white">
                  {isPaying ? "Processing…" : `Pay ₹${remaining}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {fees.length === 0 && (
        <Text className="text-sm text-gray-400">No fee records.</Text>
      )}
    </ScrollView>
  );
}
