import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";

const isExpoGo = Constants.appOwnership === "expo";

export async function registerForPushNotifications(userId: string) {
  // Push notifications don't work in Expo Go (removed in SDK 53+)
  // They require a development build or production build
  if (Platform.OS === "web" || isExpoGo) return;

  try {
    const Notifications = await import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);
  } catch {
    // Silently fail in Expo Go — notifications only work in dev/prod builds
  }
}

export type AbsenceNotifyResult = "sent" | "recorded_no_app" | "error";

export async function sendAbsenceNotification(
  recordId: string,
): Promise<AbsenceNotifyResult> {
  const { data, error } = await supabase.functions.invoke(
    "send-attendance-notification",
    { body: { recordId } },
  );
  if (error) return "error";
  const result = (data as { result?: string } | null)?.result;
  if (result === "sent") return "sent";
  if (result === "recorded_no_app") return "recorded_no_app";
  return "error";
}
