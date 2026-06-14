import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { clearActiveContext } from "../lib/active-context";

export default function NoAccessScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
          No access to this school
        </Text>
        <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
          This account isn't registered with this school. Please contact your school administrator.
        </Text>
        <TouchableOpacity
          onPress={async () => { await clearActiveContext(); await supabase.auth.signOut(); }}
          style={{ backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
