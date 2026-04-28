import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert("Login failed", error.message);
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

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Email</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
              <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
              <TextInput style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }} placeholder="you@school.com" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
              <TextInput style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }} placeholder="••••••••" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} onPress={() => setShowPassword(!showPassword)} />
            </View>
          </View>

          <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} />
          <Text style={{ textAlign: "center", marginTop: 20, fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary }}>Forgot password?</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
