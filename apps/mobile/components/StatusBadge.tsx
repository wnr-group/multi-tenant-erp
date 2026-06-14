import { View, Text } from "react-native";
import { useTheme } from "../lib/theme";

type BadgeVariant = "paid" | "pending" | "overdue" | "partial" | "present" | "absent" | "late" | "unmarked";

const LABELS: Record<BadgeVariant, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  partial: "Partial",
  present: "Present",
  absent: "Absent",
  late: "Late",
  unmarked: "Not Marked",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
}

export function StatusBadge({ variant }: StatusBadgeProps) {
  const theme = useTheme();
  const config: Record<BadgeVariant, { bg: string; text: string }> = {
    paid: { bg: theme.success + "1A", text: theme.success },
    pending: { bg: theme.warning + "1A", text: theme.warning },
    overdue: { bg: theme.danger + "1A", text: theme.danger },
    partial: { bg: "#F59E0B1A", text: "#F59E0B" },
    present: { bg: theme.success + "1A", text: theme.success },
    absent: { bg: theme.danger + "1A", text: theme.danger },
    late: { bg: theme.warning + "1A", text: theme.warning },
    unmarked: { bg: theme.textMuted + "1A", text: theme.textMuted },
  };
  const { bg, text } = config[variant as BadgeVariant] ?? { bg: theme.surface, text: theme.textMuted };
  return (
    <View style={{ backgroundColor: bg, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: text }}>
        {LABELS[variant]}
      </Text>
    </View>
  );
}
