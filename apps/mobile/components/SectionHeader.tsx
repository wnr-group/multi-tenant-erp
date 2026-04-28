import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../lib/theme";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary }}>
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
