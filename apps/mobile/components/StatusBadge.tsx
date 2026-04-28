import { View, Text } from "react-native";
import { useTheme } from "../lib/theme";

type BadgeVariant = "paid" | "pending" | "overdue" | "present" | "absent" | "late";

const LABELS: Record<BadgeVariant, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  present: "Present",
  absent: "Absent",
  late: "Late",
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
    present: { bg: theme.success + "1A", text: theme.success },
    absent: { bg: theme.danger + "1A", text: theme.danger },
    late: { bg: theme.warning + "1A", text: theme.warning },
  };
  const { bg, text } = config[variant];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: text }}>
        {LABELS[variant]}
      </Text>
    </View>
  );
}
