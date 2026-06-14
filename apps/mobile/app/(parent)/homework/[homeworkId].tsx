import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useActiveContext } from "../../../lib/active-context";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { StatusBadge } from "../../../components/StatusBadge";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  loadStudentStatus, loadAttachments, getSignedUrl, markViewed, markDone, unmarkDone,
  AttachmentRow, ParentHomeworkState, HomeworkRating,
} from "../../../lib/homework";

const RATING_LABEL: Record<HomeworkRating, string> = {
  good: "Good", satisfactory: "Satisfactory", needs_improvement: "Needs Improvement",
};
const BADGE: Record<ParentHomeworkState, "hw_new" | "hw_viewed" | "hw_done" | "hw_reviewed"> = {
  new: "hw_new", viewed: "hw_viewed", done: "hw_done", reviewed: "hw_reviewed",
};

export default function ParentHomeworkDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { homeworkId } = useLocalSearchParams<{ homeworkId: string }>();
  const { studentId } = useActiveContext();

  const [data, setData] = useState<Awaited<ReturnType<typeof loadStudentStatus>>>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!homeworkId || !studentId) return;
    setLoading(true);
    // Auto-mark viewed on open (idempotent; never downgrades 'done').
    await markViewed(homeworkId, studentId);
    const [d, a] = await Promise.all([
      loadStudentStatus(homeworkId, studentId),
      loadAttachments(homeworkId),
    ]);
    setData(d);
    setAttachments(a);
    setLoading(false);
  }, [homeworkId, studentId]);

  useEffect(() => { load(); }, [load]);

  async function onMarkDone() {
    if (!homeworkId || !studentId) return;
    setBusy(true);
    const { error } = await markDone(homeworkId, studentId);
    setBusy(false);
    if (error) { Alert.alert("Error", error); return; }
    load();
  }

  async function onUndo() {
    if (!homeworkId || !studentId) return;
    setBusy(true);
    const { error } = await unmarkDone(homeworkId, studentId);
    setBusy(false);
    if (error) {
      Alert.alert("Cannot undo", error === "already_reviewed" ? "This homework has already been reviewed by the teacher." : error);
      return;
    }
    load();
  }

  async function openAttachment(path: string) {
    const url = await getSignedUrl(path);
    if (url) Linking.openURL(url); else Alert.alert("Error", "Could not open attachment");
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(parent)/academics"))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }} numberOfLines={1}>Homework</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
        {loading || !data ? (
          <SkeletonCard />
        ) : (
          <>
            <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{data.title}</Text>
                <StatusBadge variant={BADGE[data.state]} />
              </View>
              {data.subject ? (
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary }}>{data.subject}</Text>
              ) : null}
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textMuted }}>
                Due {new Date(data.dueDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
              {data.description ? (
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, marginTop: 4 }}>{data.description}</Text>
              ) : null}
            </View>

            {attachments.length > 0 && (
              <View style={{ gap: 8 }}>
                {attachments.map((a) => (
                  <TouchableOpacity key={a.id} onPress={() => openAttachment(a.fileUrl)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderRadius: 12, padding: 12 }}>
                    <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }} numberOfLines={1}>{a.fileName}</Text>
                    <Ionicons name="open-outline" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Teacher feedback (once reviewed) */}
            {data.state === "reviewed" && (
              <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Teacher feedback</Text>
                {data.rating ? (
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.success }}>{RATING_LABEL[data.rating]}</Text>
                ) : null}
                {data.teacherComment ? (
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}>{data.teacherComment}</Text>
                ) : null}
              </View>
            )}

            {/* Action: Mark done / Undo. Locked once reviewed. */}
            {data.state === "reviewed" ? null : data.state === "done" ? (
              <TouchableOpacity onPress={onUndo} disabled={busy} style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textMuted }}>Undo "Done"</Text>
              </TouchableOpacity>
            ) : (
              <PrimaryButton label="Mark as Done" onPress={onMarkDone} loading={busy} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
