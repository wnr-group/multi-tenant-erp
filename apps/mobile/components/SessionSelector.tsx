import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../lib/theme";
import { AttendanceSession, SESSION_LABELS } from "../lib/attendance";

interface Props {
  value: AttendanceSession;
  onChange: (s: AttendanceSession) => void;
  /** Sessions that cannot be selected (mode-lock), with an optional hint. */
  disabled?: Partial<Record<AttendanceSession, string>>;
}

const ORDER: AttendanceSession[] = ["FULL_DAY", "FN", "AN"];

export function SessionSelector({ value, onChange, disabled = {} }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, padding: 4, gap: 4 }}>
        {ORDER.map((s) => {
          const isDisabled = !!disabled[s];
          const active = value === s;
          return (
            <TouchableOpacity
              key={s}
              disabled={isDisabled}
              onPress={() => onChange(s)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center",
                backgroundColor: active ? theme.primary : "transparent",
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <Text style={{
                fontSize: 13, fontFamily: "Inter_600SemiBold",
                color: active ? "#fff" : theme.textSecondary,
              }}>
                {SESSION_LABELS[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {ORDER.filter((s) => disabled[s]).slice(0, 1).map((s) => (
        <Text key={s} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, paddingHorizontal: 4 }}>
          {disabled[s]}
        </Text>
      ))}
    </View>
  );
}
