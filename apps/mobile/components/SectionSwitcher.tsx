import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { useTeacherContext } from "../lib/teacherContext";

export function SectionSwitcher() {
  const theme = useTheme();
  const { sections, activeSection, setActiveSectionId } = useTeacherContext();

  if (sections.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8, flexDirection: "row" }}
    >
      {sections.map((sec) => {
        const active = activeSection?.id === sec.id;
        return (
          <TouchableOpacity
            key={sec.id}
            onPress={() => setActiveSectionId(sec.id)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 100,
              backgroundColor: active ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
            }}
          >
            {sec.isHomeroom && (
              <Ionicons
                name="home-outline"
                size={12}
                color={active ? "#fff" : theme.textMuted}
              />
            )}
            <Text
              style={{
                fontSize: 13,
                fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                color: active ? "#fff" : theme.textSecondary,
              }}
            >
              {sec.shortLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
