import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

function DonutChart({ paid, total }: { paid: number; total: number }) {
  const size = 120;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const paidPct = total > 0 ? Math.max(0, Math.min(1, paid / total)) : 0;
  const paidDash = paidPct * circumference;

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth}
          />
          {paidDash > 0 && (
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="#fff" strokeWidth={strokeWidth}
              strokeDasharray={`${paidDash} ${circumference}`}
              strokeLinecap="round"
            />
          )}
        </G>
        <SvgText
          x={size / 2} y={size / 2 - 6}
          textAnchor="middle" fill="#fff"
          fontSize="14" fontWeight="700"
        >
          {total > 0 ? `${Math.round(paidPct * 100)}%` : "0%"}
        </SvgText>
        <SvgText
          x={size / 2} y={size / 2 + 12}
          textAnchor="middle" fill="rgba(255,255,255,0.7)"
          fontSize="10"
        >
          paid
        </SvgText>
      </Svg>
    </View>
  );
}

interface FeePayment {
  id: string; // feeStructureId used as stable key
  fee_type: string;
  amount_due: number; // unit_amount × installment_count
  amount_paid: number; // sum of all payments
  due_date: string;
  status: "paid" | "pending" | "overdue" | "partial";
  paid_at?: string;
  transaction_id?: string;
}

interface PaymentHistoryRow {
  id: string;
  fee_type: string;
  amount_paid: number;
  paid_at: string | null;
  transaction_id: string | null;
}

export default function ParentFees() {
  const theme = useTheme();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipt, setReceipt] = useState<PaymentHistoryRow | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => { loadFees(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFees();
    setRefreshing(false);
  }, []);

  async function loadFees() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Look up parent's student
    const { data: sp } = await supabase.from("student_profiles").select("id, class_id").eq("parent_profile_id", user.id).single();
    const studentId = sp?.id;
    const classId = sp?.class_id;
    if (!studentId) { setLoading(false); return; }

    // Fetch fee structures for the student's class + all payment rows for the student
    const [{ data: feeStructures }, { data: paymentRows }] = await Promise.all([
      supabase.from("fee_structures")
        .select("id, fee_type, amount, due_date")
        .eq("class_id", classId ?? "00000000-0000-0000-0000-000000000000"),
      supabase.from("fee_payments")
        .select("id, fee_structure_id, amount_paid, concession_amount, payment_date, receipt_number, status")
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false }),
    ]);

    // Aggregate per fee structure
    const paidMap = new Map<string, number>();
    const concessionMap = new Map<string, number>();
    const lastPaidAt = new Map<string, string>();
    const lastReceiptNo = new Map<string, string>();
    for (const p of paymentRows ?? []) {
      const fsId = p.fee_structure_id;
      paidMap.set(fsId, (paidMap.get(fsId) ?? 0) + (p.amount_paid ?? 0));
      concessionMap.set(fsId, (concessionMap.get(fsId) ?? 0) + (p.concession_amount ?? 0));
      if (p.payment_date && !lastPaidAt.has(fsId)) lastPaidAt.set(fsId, p.payment_date);
      if (p.receipt_number && !lastReceiptNo.has(fsId)) lastReceiptNo.set(fsId, p.receipt_number);
    }

    const aggregated: FeePayment[] = (feeStructures ?? []).map((fs: any) => {
      const amountDue = fs.amount ?? 0;
      const amountPaid = paidMap.get(fs.id) ?? 0;
      const concessionTotal = concessionMap.get(fs.id) ?? 0;
      const effective = amountPaid + concessionTotal;
      const status: FeePayment["status"] =
        effective >= amountDue ? "paid"
        : amountPaid > 0 || concessionTotal > 0 ? "partial"
        : "pending";
      return {
        id: fs.id,
        fee_type: fs.fee_type ?? "",
        amount_due: amountDue,
        amount_paid: amountPaid,
        due_date: fs.due_date ?? "",
        status,
        paid_at: lastPaidAt.get(fs.id),
        transaction_id: lastReceiptNo.get(fs.id),
      };
    });

    setPayments(aggregated);

    // Build history from individual payment rows that have actual money paid
    const feeTypeMap = new Map<string, string>();
    for (const fs of feeStructures ?? []) feeTypeMap.set((fs as any).id, (fs as any).fee_type ?? "");
    setHistory(
      (paymentRows ?? [])
        .filter((p: any) => (p.amount_paid ?? 0) > 0)
        .map((p: any) => ({
          id: p.id,
          fee_type: feeTypeMap.get(p.fee_structure_id) ?? "",
          amount_paid: p.amount_paid ?? 0,
          paid_at: p.payment_date ?? null,
          transaction_id: p.receipt_number ?? null,
        }))
    );

    setLoading(false);
  }

  const totalDue = payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + (p.amount_due - p.amount_paid), 0);
  const totalFeeAmount = payments.reduce((sum, p) => sum + p.amount_due, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
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
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Fees</Text>

        {/* Balance card */}
        {loading ? <SkeletonCard /> : (
          <View style={{ backgroundColor: theme.primary, borderRadius: 20, padding: 24, gap: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Outstanding</Text>
            <DonutChart paid={totalPaid} total={totalFeeAmount} />
            <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" }}>₹{totalDue.toLocaleString("en-IN")}</Text>
            {nextDue && (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" }}>
                Next due: {nextDue.due_date ? new Date(nextDue.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>Due {p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</Text>
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
          ) : history.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>No payments yet</Text>
          ) : history.map((p) => (
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
