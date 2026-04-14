import { View, Text } from "react-native";

export default function LoginScreen() {
  const schoolName = process.env.EXPO_PUBLIC_SCHOOL_NAME ?? "School ERP";
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", padding: 32 }}>
      <Text style={{ fontSize: 30, fontWeight: "bold", color: "#111827", marginBottom: 8 }}>{schoolName}</Text>
      <Text style={{ color: "#6b7280" }}>Authentication coming in Plan 2.</Text>
    </View>
  );
}
