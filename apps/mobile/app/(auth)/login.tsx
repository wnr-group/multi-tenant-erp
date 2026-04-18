import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#111827", marginBottom: 32 }}>
          Balaji ERP
        </Text>

        {error && (
          <View style={{ marginBottom: 16, width: "100%", backgroundColor: "#fef2f2", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: "#dc2626" }}>{error}</Text>
          </View>
        )}

        <TextInput
          style={{ marginBottom: 12, width: "100%", borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 }}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={{ marginBottom: 24, width: "100%", borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 }}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ width: "100%", borderRadius: 8, backgroundColor: "#2563eb", paddingVertical: 12, opacity: loading ? 0.5 : 1 }}
        >
          <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "600", color: "white" }}>
            {loading ? "Signing in…" : "Sign in"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
