import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            dashboard: "home-outline",
            attendance: "calendar-outline",
            results: "school-outline",
            fees: "wallet-outline",
            homework: "book-outline",
            announcements: "megaphone-outline",
            feedback: "chatbubble-outline",
            discipline: "warning-outline",
            profile: "person-outline",
          };
          return (
            <Ionicons
              name={icons[route.name] ?? "ellipse-outline"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance" }} />
      <Tabs.Screen name="results" options={{ title: "Results" }} />
      <Tabs.Screen name="fees" options={{ title: "Fees" }} />
      <Tabs.Screen name="homework" options={{ title: "Homework" }} />
      <Tabs.Screen name="announcements" options={{ title: "News" }} />
      <Tabs.Screen name="feedback" options={{ title: "Feedback" }} />
      <Tabs.Screen name="discipline" options={{ title: "Discipline" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
