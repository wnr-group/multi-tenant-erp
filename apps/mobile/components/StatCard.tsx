import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  variant?: "default" | "warning" | "danger";
}

export function StatCard({ icon, value, label, variant = "default" }: StatCardProps) {
  const theme = useTheme();
  const color =
    variant === "danger"
      ? theme.danger
      : variant === "warning"
      ? theme.warning
      : theme.primary;
  const bgColor = color + "1A";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
