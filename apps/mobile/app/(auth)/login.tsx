import { View, Text } from "react-native";

export default function LoginScreen() {
  const schoolName = process.env.EXPO_PUBLIC_SCHOOL_NAME ?? "School ERP";
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-8">
      <Text className="mb-2 text-3xl font-bold text-gray-900">{schoolName}</Text>
      <Text className="text-gray-500">Authentication coming in Plan 2.</Text>
    </View>
  );
}
