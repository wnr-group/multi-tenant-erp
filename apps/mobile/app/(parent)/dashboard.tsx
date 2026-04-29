import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatCard } from "../../components/StatCard";
import { SectionHeader } from "../../components/SectionHeader";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";
import { Avatar } from "../../components/Avatar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_HEIGHT = 180;

interface GalleryItem { id: string; image_url: string; caption: string | null }
interface StudentInfo {
  id: string;
  name: string;
  className: string;
  sectionName: string;
  rollNumber: string;
  admissionNumber: string;
  photoUrl: string | null;
}
interface DashboardData {
  parentName: string;
  student: StudentInfo | null;
  attendancePct: number;
  pendingFees: number;
  homeworkDue: number;
  announcements: { id: string; title: string; created_at: string }[];
  gallery: GalleryItem[];
}

export default function ParentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  useEffect(() => { loadDashboard(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, spRes] = await Promise.all([
      supabase.from("profiles").select("full_name, school_id").eq("id", user.id).single(),
      supabase
        .from("student_profiles")
        .select("id, full_name, admission_number, roll_number, photo_url, sections(id, name, classes(name))")
        .eq("parent_profile_id", user.id)
        .single(),
    ]);

    const schoolId = profileRes.data?.school_id;
    const sp = spRes.data as any;
    const studentId = sp?.id;

    const [attendanceRes, feesRes, homeworkRes, announcementsRes, galleryRes] = await Promise.all([
      studentId
        ? supabase.from("attendance_records").select("status").eq("student_id", studentId)
        : Promise.resolve({ data: [] }),
      studentId
        ? supabase.from("fee_payments").select("amount_paid, fee_structures(amount)").eq("student_id", studentId).eq("status", "pending")
        : Promise.resolve({ data: [] }),
      sp?.sections?.id
        ? supabase.from("homework").select("id").eq("section_id", sp.sections.id).gte("due_date", new Date().toISOString().split("T")[0])
        : Promise.resolve({ data: [] }),
      supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
      schoolId
        ? supabase.from("school_gallery").select("id, image_url, caption").eq("school_id", schoolId).order("display_order").order("created_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    const totalDays = attendanceRes.data?.length ?? 0;
    const presentDays = attendanceRes.data?.filter((r: any) => r.status === "present").length ?? 0;
    const pendingFees = (feesRes.data ?? []).reduce((sum: number, r: any) => sum + ((r.fee_structures?.amount ?? 0) - r.amount_paid), 0);

    const student: StudentInfo | null = sp ? {
      id: sp.id,
      name: sp.full_name ?? "Student",
      className: sp.sections?.classes?.name ?? "",
      sectionName: sp.sections?.name ?? "",
      rollNumber: sp.roll_number ?? "",
      admissionNumber: sp.admission_number ?? "",
      photoUrl: sp.photo_url ?? null,
    } : null;

    setData({
      parentName: profileRes.data?.full_name ?? "Parent",
      student,
      attendancePct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      pendingFees,
      homeworkDue: homeworkRes.data?.length ?? 0,
      announcements: announcementsRes.data ?? [],
      gallery: galleryRes.data ?? [],
    });
    setLoading(false);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quickActions = [
    { icon: "wallet-outline" as const, label: "Pay Fees", route: "/(parent)/fees" },
    { icon: "trophy-outline" as const, label: "Results", route: "/(parent)/academics" },
    { icon: "book-outline" as const, label: "Homework", route: "/(parent)/academics" },
    { icon: "megaphone-outline" as const, label: "News", route: "/(parent)/more" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          {loading ? <Skeleton height={28} width="60%" /> : (
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
              {greeting}, {data?.parentName?.split(" ")[0]} 👋
            </Text>
          )}
        </View>

        {/* ── Gallery carousel ── */}
        {!loading && (data?.gallery?.length ?? 0) > 0 && (
          <View style={{ marginBottom: 20 }}>
            <FlatList
              ref={carouselRef}
              data={data!.gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_WIDTH}
              decelerationRate="fast"
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}
                    resizeMode="cover"
                  />
                  {item.caption && (
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.4)" }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" }}>{item.caption}</Text>
                    </View>
                  )}
                </View>
              )}
            />
            {data!.gallery.length > 1 && (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8 }}>
                {data!.gallery.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === activeSlide ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === activeSlide ? theme.primary : theme.border,
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ paddingHorizontal: 20, gap: 24 }}>
          {/* ── Student card ── */}
          {!loading && data?.student && (
            <View style={{
              backgroundColor: theme.surface,
              borderRadius: 20,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
              {data.student.photoUrl ? (
                <Image
                  source={{ uri: data.student.photoUrl }}
                  style={{ width: 56, height: 56, borderRadius: 14 }}
                  resizeMode="cover"
                />
              ) : (
                <Avatar name={data.student.name} size={56} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
                  {data.student.name}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary }}>
                  {data.student.className} {data.student.sectionName}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                  {data.student.rollNumber ? (
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>
                      Roll #{data.student.rollNumber}
                    </Text>
                  ) : null}
                  {data.student.admissionNumber ? (
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>
                      Adm #{data.student.admissionNumber}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }} />
            </View>
          )}
          {loading && <SkeletonCard />}

          {/* ── Stats strip ── */}
          {loading ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[0,1,2].map(i => <View key={i} style={{ flex: 1 }}><SkeletonCard /></View>)}
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatCard icon="checkmark-circle-outline" value={`${data?.attendancePct}%`} label="Attendance" />
              <StatCard icon="wallet-outline" value={`₹${((data?.pendingFees ?? 0) / 1000).toFixed(0)}k`} label="Pending" variant={(data?.pendingFees ?? 0) > 0 ? "warning" : "default"} />
              <StatCard icon="book-outline" value={`${data?.homeworkDue}`} label="Due Today" variant={(data?.homeworkDue ?? 0) > 0 ? "danger" : "default"} />
            </View>
          )}

          {/* ── Quick actions ── */}
          <View>
            <SectionHeader title="Quick Actions" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={action.icon} size={20} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textSecondary, textAlign: "center" }}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Latest news ── */}
          <View>
            <SectionHeader title="Latest News" onSeeAll={() => router.push("/(parent)/more")} />
            {loading ? (
              <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
            ) : (data?.announcements ?? []).length === 0 ? (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>No announcements yet</Text>
            ) : data!.announcements.map((a) => (
              <View key={a.id} style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }}>{a.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 4 }}>
                  {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
