import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";

export function AppBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const name = theme.schoolName || "School ERP";

  // Derive initials from school name (up to 2 words)
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      {/* Logo pill */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 }}>
          {initials}
        </Text>
      </View>

      <Text
        style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.textPrimary, flex: 1 }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}
