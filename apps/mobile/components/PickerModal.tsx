import { Modal, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

export interface PickerOption { label: string; value: string }

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  value: string;
  onSelect: (value: string, label: string) => void;
  onClose: () => void;
}

export function PickerModal({ visible, title, options, value, onSelect, onClose }: PickerModalProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: "60%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {options.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No options available</Text>
            ) : options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onSelect(opt.value, opt.label); onClose(); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border + "60" }}
                activeOpacity={0.6}
              >
                <Text style={{ fontSize: 15, fontFamily: value === opt.value ? "Inter_600SemiBold" : "Inter_400Regular", color: value === opt.value ? theme.primary : theme.textPrimary }}>
                  {opt.label}
                </Text>
                {value === opt.value && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface SelectRowProps {
  label: string;
  displayValue: string;
  placeholder: string;
  onPress: () => void;
}

export function SelectRow({ label, displayValue, placeholder, onPress }: SelectRowProps) {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surfaceRaised, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: theme.border }}
      >
        <Text style={{ fontSize: 14, fontFamily: displayValue ? "Inter_500Medium" : "Inter_400Regular", color: displayValue ? theme.textPrimary : theme.textMuted }}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
