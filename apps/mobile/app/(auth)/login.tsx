import { useState, useEffect } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function LoginScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSendOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${digits}` });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setStep("otp");
    setResendCooldown(30);
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.replace(/\D/g, "")}`,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", "Invalid or expired OTP. Please try again.");
    }
    // On success, _layout.tsx session listener triggers role-based navigation automatically
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone.replace(/\D/g, "")}` });
    if (error) Alert.alert("Error", error.message);
    else setResendCooldown(30);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="school" size={36} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Welcome back</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 4 }}>Sign in to continue</Text>
          </View>

          {step === "phone" ? (
            <>
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Mobile Number</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
                  <View style={{ paddingHorizontal: 14, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.surfaceRaised, borderRightWidth: 1, borderRightColor: theme.border }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textSecondary }}>+91</Text>
                  </View>
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, paddingHorizontal: 14 }}
                    placeholder="9876543210"
                    placeholderTextColor={theme.textMuted}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              <PrimaryButton label="Send OTP" onPress={handleSendOtp} loading={loading} />
            </>
          ) : (
            <>
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
                  OTP sent to{" "}
                  <Text style={{ fontFamily: "Inter_500Medium", color: theme.textPrimary }}>+91 {phone}</Text>
                </Text>
                <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary, marginTop: 2 }}>Change number</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginBottom: 24, marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Enter OTP</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
                  <Ionicons name="keypad-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary, letterSpacing: 8 }}
                    placeholder="------"
                    placeholderTextColor={theme.textMuted}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <PrimaryButton label="Verify OTP" onPress={handleVerifyOtp} loading={loading} />
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0} style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: resendCooldown > 0 ? theme.textMuted : theme.primary }}>
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
