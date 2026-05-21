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
              strokeLinecap={paidPct >= 1 ? "butt" : "round"}
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

interface FeeLineItem {
  id: string;
  fee_type: string;
  total_amount: number;
  amount_paid: number;
  outstanding: number;
  due_date: string;
  status: "paid" | "pending" | "partial";
}

interface PaymentHistoryRow {
  id: string;
  total_amount: number;
  paid_at: string | null;
  payment_method: string;
  mode: string;
  transaction_id: string | null;
  line_items_covered: { fee_type: string; amount_applied: number }[];
}

export default function ParentFees() {
  const theme = useTheme();
  const [lineItems, setLineItems] = useState<FeeLineItem[]>([]);
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    if (!user) { setLoading(false); return; }

    const { data: sp } = await supabase
      .from("student_profiles")
      .select("id, school_id")
      .eq("parent_profile_id", user.id)
      .single();

    if (!sp) { setLoading(false); return; }

    const [{ data: lineItemsData }, { data: paymentsData }] = await Promise.all([
      supabase
        .from("fee_line_items")
        .select("id, fee_type, total_amount, due_date, status")
        .eq("student_id", sp.id)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("payments")
        .select("id, payment_date, total_amount, payment_method, mode, transaction_id, razorpay_payment_id, line_item_payments(amount_applied, line_item_id, fee_line_items!line_item_id(fee_type))")
        .eq("student_id", sp.id)
        .order("payment_date", { ascending: false }),
    ]);

    const paidMap: Record<string, number> = {};
    for (const p of paymentsData ?? []) {
      for (const lip of (p as any).line_item_payments ?? []) {
        const liId: string = lip.line_item_id ?? "";
        paidMap[liId] = (paidMap[liId] ?? 0) + (lip.amount_applied ?? 0);
      }
    }

    const items: FeeLineItem[] = (lineItemsData ?? []).map((li: any) => {
      const paid = paidMap[li.id] ?? 0;
      const outstanding = Math.max(0, li.total_amount - paid);
      return {
        id: li.id,
        fee_type: li.fee_type ?? "",
        total_amount: li.total_amount ?? 0,
        amount_paid: paid,
        outstanding,
        due_date: li.due_date ?? "",
        status: li.status ?? "pending",
      };
    });

    setLineItems(items);
    setHistory(
      (paymentsData ?? []).map((p: any) => ({
        id: p.id,
        total_amount: p.total_amount ?? 0,
        paid_at: p.payment_date ?? null,
        payment_method: p.payment_method ?? "",
        mode: p.mode ?? "",
        transaction_id: p.transaction_id ?? p.razorpay_payment_id ?? null,
        line_items_covered: ((p.line_item_payments ?? []) as any[]).map((lip: any) => ({
          fee_type: (lip.fee_line_items as { fee_type?: string } | null)?.fee_type ?? "—",
          amount_applied: lip.amount_applied ?? 0,
        })),
      }))
    );
    setLoading(false);
  }

  const totalFeeAmount = lineItems.reduce((s, li) => s + li.total_amount, 0);
  const totalPaid = lineItems.reduce((s, li) => s + li.amount_paid, 0);
  const totalDue = lineItems.reduce((s, li) => s + li.outstanding, 0);
  const nextDue = lineItems.filter((li) => li.status !== "paid").sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePaySelected() {
    const selected = lineItems.filter((li) => selectedIds.has(li.id) && li.status !== "paid");
    if (selected.length === 0) return;

    const totalOutstanding = selected.reduce((s, li) => s + li.outstanding, 0);
    const amountPaise = Math.round(totalOutstanding * 100);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sp } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("parent_profile_id", user.id)
      .single();
    if (!sp) return;

    setPayingId("selected");
    try {
      const apiBase = process.env.EXPO_PUBLIC_WEB_API_URL ?? "";
      const orderRes = await fetch(`${apiBase}/api/fees/create-razorpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_paise: amountPaise,
          student_id: sp.id,
          line_item_ids: selected.map((li) => li.id),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order creation failed");

      const options = {
        description: selected.map((li) => li.fee_type).join(", "),
        currency: "INR",
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: amountPaise,
        name: "School Fees",
        order_id: orderData.order_id,
        prefill: { email: user.email ?? "", contact: "", name: "" },
        theme: { color: "#4F46E5" },
      };

      await RazorpayCheckout.open(options as any);
      // Webhook handles DB write; refresh after short delay
      await new Promise((r) => setTimeout(r, 2000));
      setSelectedIds(new Set());
      await loadFees();
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
            {totalDue > 0 && (
              <TouchableOpacity onPress={() => {
                const pendingIds = lineItems.filter((li) => li.status !== "paid").map((li) => li.id);
                setSelectedIds(new Set(pendingIds));
              }} style={{ backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.primary }}>Select All & Pay</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Fee breakdown */}
        <View>
          <SectionHeader title="Fee Breakdown" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : lineItems.filter((li) => li.status !== "paid").length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>All fees paid!</Text>
          ) : lineItems.filter((li) => li.status !== "paid").map((li) => (
            <TouchableOpacity
              key={li.id}
              onPress={() => toggleSelect(li.id)}
              activeOpacity={0.7}
              style={{
                backgroundColor: selectedIds.has(li.id) ? `${theme.primary}18` : theme.surface,
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                borderWidth: 1.5,
                borderColor: selectedIds.has(li.id) ? theme.primary : "transparent",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
                  borderColor: selectedIds.has(li.id) ? theme.primary : theme.border,
                  backgroundColor: selectedIds.has(li.id) ? theme.primary : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {selectedIds.has(li.id) && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{li.fee_type}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
                    Due {li.due_date ? new Date(li.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>₹{li.outstanding.toLocaleString("en-IN")}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {selectedIds.size > 0 && (
            <TouchableOpacity
              onPress={handlePaySelected}
              disabled={payingId === "selected"}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
                {payingId === "selected" ? "Processing…" : `Pay ₹${lineItems.filter((li) => selectedIds.has(li.id)).reduce((s, li) => s + li.outstanding, 0).toLocaleString("en-IN")}`}
              </Text>
            </TouchableOpacity>
          )}
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
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>
                  {p.line_items_covered.length > 0 ? p.line_items_covered.map((lic) => lic.fee_type).join(", ") : "Payment"}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.success }}>₹{p.total_amount.toLocaleString("en-IN")}</Text>
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
                  { label: "Amount Paid", value: `₹${receipt.total_amount.toLocaleString("en-IN")}` },
                  { label: "Date", value: receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                  { label: "Transaction ID", value: receipt.transaction_id ?? "—" },
                  { label: "Status", value: "Paid" },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{row.value}</Text>
                  </View>
                ))}
                {receipt.line_items_covered?.length > 0 && (
                  <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginBottom: 4 }}>Applied to</Text>
                    {receipt.line_items_covered.map((lic: any, i: number) => (
                      <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{lic.fee_type}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>₹{lic.amount_applied.toLocaleString("en-IN")}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <PrimaryButton label="Close" onPress={() => setReceipt(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
