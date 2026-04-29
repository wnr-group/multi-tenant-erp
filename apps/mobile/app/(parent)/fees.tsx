import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

interface FeePayment {
  id: string;
  fee_type: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: "paid" | "pending" | "overdue";
  paid_at?: string;
  transaction_id?: string;
}

export default function ParentFees() {
  const theme = useTheme();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => { loadFees(); }, []);

  async function loadFees() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Look up parent's student
    const { data: sp } = await supabase.from("student_profiles").select("id").eq("parent_profile_id", user.id).single();
    const studentId = sp?.id;
    if (!studentId) { setLoading(false); return; }
    const { data } = await supabase.from("fee_payments")
      .select("id, amount_paid, payment_date, payment_method, receipt_number, status, razorpay_order_id, fee_structures(fee_type, amount, due_date)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setPayments((data ?? []).map((r: any) => ({
      id: r.id,
      fee_type: r.fee_structures?.fee_type ?? "",
      amount_due: r.fee_structures?.amount ?? 0,
      amount_paid: r.amount_paid,
      due_date: r.fee_structures?.due_date ?? "",
      status: r.status,
      paid_at: r.payment_date,
      transaction_id: r.receipt_number,
    })));
    setLoading(false);
  }

  const totalDue = payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + (p.amount_due - p.amount_paid), 0);
  const nextDue = payments.filter((p) => p.status === "pending").sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  async function handlePayNow(payment: FeePayment) {
    setPayingId(payment.id);
    const amountPaise = (payment.amount_due - payment.amount_paid) * 100;
    const options = {
      description: payment.fee_type,
      currency: "INR",
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_placeholder",
      amount: amountPaise,
      name: "School ERP",
      order_id: "",
      prefill: { email: "", contact: "", name: "" },
      theme: { color: theme.primary },
    };
    try {
      const data = await RazorpayCheckout.open(options as any);
      await supabase.from("fee_payments").update({ status: "paid", amount_paid: payment.amount_due, payment_date: new Date().toISOString(), receipt_number: data.razorpay_payment_id }).eq("id", payment.id);
      loadFees();
    } catch (e: any) {
      if (e?.code !== "PAYMENT_CANCELLED") Alert.alert("Payment failed", e?.description ?? "Try again");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Fees</Text>

        {/* Balance card */}
        {loading ? <SkeletonCard /> : (
          <View style={{ backgroundColor: theme.primary, borderRadius: 20, padding: 24, gap: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Outstanding</Text>
            <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" }}>₹{totalDue.toLocaleString("en-IN")}</Text>
            {nextDue && (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" }}>
                Next due: {new Date(nextDue.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            )}
            {totalDue > 0 && nextDue && (
              <TouchableOpacity onPress={() => handlePayNow(nextDue)} style={{ backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.primary }}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Fee breakdown */}
        <View>
          <SectionHeader title="Fee Breakdown" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : payments.filter((p) => p.status !== "paid").map((p) => (
            <View key={p.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{p.fee_type}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>Due {new Date(p.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>₹{(p.amount_due - p.amount_paid).toLocaleString("en-IN")}</Text>
                <StatusBadge variant={p.status} />
              </View>
            </View>
          ))}
        </View>

        {/* Payment history */}
        <View>
          <SectionHeader title="Payment History" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : payments.filter((p) => p.status === "paid").length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>No payments yet</Text>
          ) : payments.filter((p) => p.status === "paid").map((p) => (
            <TouchableOpacity key={p.id} onPress={() => setReceipt(p)} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }} activeOpacity={0.7}>
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{p.fee_type}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.success }}>₹{p.amount_paid.toLocaleString("en-IN")}</Text>
                <StatusBadge variant="paid" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Receipt modal */}
      <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={() => setReceipt(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Receipt</Text>
              <TouchableOpacity onPress={() => setReceipt(null)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {receipt && (
              <View style={{ gap: 12 }}>
                {[
                  { label: "Fee Type", value: receipt.fee_type },
                  { label: "Amount Paid", value: `₹${receipt.amount_paid.toLocaleString("en-IN")}` },
                  { label: "Date", value: receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                  { label: "Transaction ID", value: receipt.transaction_id ?? "—" },
                  { label: "Status", value: "Paid" },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
            <PrimaryButton label="Close" onPress={() => setReceipt(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
