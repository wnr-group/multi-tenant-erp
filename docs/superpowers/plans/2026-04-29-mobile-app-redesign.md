# Mobile App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Expo mobile app UI from scratch with a premium fintech-inspired design system, dynamic per-school theming, Inter font, skeleton loading states, and redesigned screens for both parent and teacher portals.

**Architecture:** Single Expo app with role-based routing post-login. A `ThemeContext` loads `schools.primary_color` from Supabase after auth and provides dynamic color tokens app-wide. NativeWind handles layout/spacing; ThemeContext handles the dynamic primary color. All screens are rewritten to match Stitch designs in `stitch-designs/mobile-app-design/`.

**Tech Stack:** Expo SDK 55, React Native 0.83, Expo Router v4, NativeWind 4, Supabase JS v2, `expo-font` (Inter), `react-native-razorpay`, `expo-notifications`

**Design Reference:** `stitch-designs/mobile-app-design/` — 8 HTML mockups + design brief

---

## File Map

### New files to create
- `apps/mobile/lib/theme.tsx` — ThemeContext + useTheme hook + color tokens
- `apps/mobile/components/Skeleton.tsx` — animated shimmer skeleton primitives
- `apps/mobile/components/StatCard.tsx` — icon + number + label card
- `apps/mobile/components/ListItem.tsx` — icon + title + subtitle + chevron row
- `apps/mobile/components/StatusBadge.tsx` — Paid/Pending/Overdue/Present/Absent chips
- `apps/mobile/components/SectionHeader.tsx` — title + optional "See all" link
- `apps/mobile/components/Avatar.tsx` — initials fallback avatar
- `apps/mobile/components/PrimaryButton.tsx` — full-width + compact variants

### Files to fully rewrite
- `apps/mobile/app/_layout.tsx` — add ThemeProvider + useFonts + splash hold
- `apps/mobile/app/(auth)/login.tsx` — new design
- `apps/mobile/app/(parent)/_layout.tsx` — 5-tab navigator with theme colors
- `apps/mobile/app/(parent)/dashboard.tsx` — stat cards + quick actions + announcements
- `apps/mobile/app/(parent)/attendance.tsx` — calendar grid + progress ring
- `apps/mobile/app/(parent)/academics.tsx` — segmented Results/Homework (replaces results.tsx + homework.tsx)
- `apps/mobile/app/(parent)/fees.tsx` — balance card + breakdown + history + receipt
- `apps/mobile/app/(parent)/more.tsx` — menu list (replaces announcements/feedback/discipline/profile)
- `apps/mobile/app/(teacher)/_layout.tsx` — 5-tab navigator with theme colors
- `apps/mobile/app/(teacher)/dashboard.tsx` — schedule + quick actions + pending tasks
- `apps/mobile/app/(teacher)/attendance.tsx` — full rewrite, 3-state toggle
- `apps/mobile/app/(teacher)/classes.tsx` — segmented Homework/Results (replaces homework.tsx + results.tsx)
- `apps/mobile/app/(teacher)/discipline.tsx` — rewrite with new UI
- `apps/mobile/app/(teacher)/profile.tsx` — rewrite with new UI
- `apps/mobile/package.json` — bump all deps to latest compatible versions

### Files to delete (merged into new screens)
- `apps/mobile/app/(parent)/results.tsx` → merged into academics.tsx
- `apps/mobile/app/(parent)/homework.tsx` → merged into academics.tsx
- `apps/mobile/app/(parent)/announcements.tsx` → merged into more.tsx
- `apps/mobile/app/(parent)/feedback.tsx` → merged into more.tsx
- `apps/mobile/app/(parent)/discipline.tsx` → merged into more.tsx
- `apps/mobile/app/(parent)/profile.tsx` → merged into more.tsx
- `apps/mobile/app/(teacher)/homework.tsx` → merged into classes.tsx
- `apps/mobile/app/(teacher)/results.tsx` → merged into classes.tsx

---

## Task 1: Bump Dependencies

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Update package.json with latest compatible versions**

```json
{
  "name": "@erp/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@babel/runtime": "^7.29.2",
    "@erp/shared": "workspace:*",
    "@expo/metro-runtime": "~55.0.9",
    "@expo/vector-icons": "^14.1.0",
    "@supabase/supabase-js": "^2.49.4",
    "expo": "~55.0.15",
    "expo-constants": "~55.0.14",
    "expo-font": "~55.0.6",
    "expo-haptics": "~14.1.4",
    "expo-linking": "~55.0.13",
    "expo-notifications": "~55.0.19",
    "expo-router": "~55.0.12",
    "expo-splash-screen": "~55.0.18",
    "expo-status-bar": "~55.0.5",
    "nativewind": "4.1.23",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-native": "0.83.4",
    "react-native-css-interop": "0.1.22",
    "react-native-razorpay": "^2.3.1",
    "react-native-reanimated": "~3.17.5",
    "react-native-safe-area-context": "5.6.2",
    "react-native-screens": "~4.23.0",
    "tailwindcss": "^3.4.16"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~19.2.14",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Install deps from monorepo root**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/.worktrees/feature/mobile-app-design"
pnpm install
```

Expected: no peer dependency errors, lockfile updated.

- [ ] **Step 3: Update babel.config.js to include reanimated plugin**

Current `apps/mobile/babel.config.js` — add `react-native-reanimated/plugin` (must be last):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/babel.config.js pnpm-lock.yaml
git commit -m "chore(mobile): bump deps, add reanimated + haptics + vector-icons"
```

---

## Task 2: ThemeContext

**Files:**
- Create: `apps/mobile/lib/theme.tsx`

- [ ] **Step 1: Create ThemeContext**

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";

export interface Theme {
  primary: string;
  primaryLight: string;
  surface: string;
  surfaceRaised: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

const DEFAULT_PRIMARY = "#475569";

function buildTheme(primary: string): Theme {
  return {
    primary,
    primaryLight: primary + "26", // 15% opacity hex
    surface: "#FFFFFF",
    surfaceRaised: "#F8FAFC",
    background: "#F1F5F9",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  };
}

const ThemeContext = createContext<Theme>(buildTheme(DEFAULT_PRIMARY));

export function ThemeProvider({
  children,
  schoolId,
}: {
  children: ReactNode;
  schoolId?: string;
}) {
  const [theme, setTheme] = useState<Theme>(buildTheme(DEFAULT_PRIMARY));

  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from("schools")
      .select("primary_color")
      .eq("id", schoolId)
      .single()
      .then(({ data }) => {
        if (data?.primary_color) {
          setTheme(buildTheme(data.primary_color));
        }
      });
  }, [schoolId]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/theme.tsx
git commit -m "feat(mobile): add ThemeContext with dynamic school primary color"
```

---

## Task 3: Skeleton Component

**Files:**
- Create: `apps/mobile/components/Skeleton.tsx`

- [ ] **Step 1: Create animated shimmer skeleton**

```tsx
import { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.15],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.primary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
          gap: 12,
        },
        style,
      ]}
    >
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="80%" />
      <Skeleton height={14} width="40%" />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/Skeleton.tsx
git commit -m "feat(mobile): add animated shimmer Skeleton component"
```

---

## Task 4: Shared UI Components

**Files:**
- Create: `apps/mobile/components/StatCard.tsx`
- Create: `apps/mobile/components/ListItem.tsx`
- Create: `apps/mobile/components/StatusBadge.tsx`
- Create: `apps/mobile/components/SectionHeader.tsx`
- Create: `apps/mobile/components/Avatar.tsx`
- Create: `apps/mobile/components/PrimaryButton.tsx`

- [ ] **Step 1: Create StatCard**

```tsx
// apps/mobile/components/StatCard.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  variant?: "default" | "warning" | "danger";
}

export function StatCard({ icon, value, label, variant = "default" }: StatCardProps) {
  const theme = useTheme();
  const color =
    variant === "danger"
      ? theme.danger
      : variant === "warning"
      ? theme.warning
      : theme.primary;
  const bgColor = color + "1A"; // 10% opacity

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Create ListItem**

```tsx
// apps/mobile/components/ListItem.tsx
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

interface ListItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function ListItem({ icon, title, subtitle, onPress, rightElement }: ListItemProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: theme.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ?? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Create StatusBadge**

```tsx
// apps/mobile/components/StatusBadge.tsx
import { View, Text } from "react-native";
import { useTheme } from "../lib/theme";

type BadgeVariant = "paid" | "pending" | "overdue" | "present" | "absent" | "late";

const LABELS: Record<BadgeVariant, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  present: "Present",
  absent: "Absent",
  late: "Late",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
}

export function StatusBadge({ variant }: StatusBadgeProps) {
  const theme = useTheme();
  const config: Record<BadgeVariant, { bg: string; text: string }> = {
    paid: { bg: theme.success + "1A", text: theme.success },
    pending: { bg: theme.warning + "1A", text: theme.warning },
    overdue: { bg: theme.danger + "1A", text: theme.danger },
    present: { bg: theme.success + "1A", text: theme.success },
    absent: { bg: theme.danger + "1A", text: theme.danger },
    late: { bg: theme.warning + "1A", text: theme.warning },
  };
  const { bg, text } = config[variant];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: text }}>
        {LABELS[variant]}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Create SectionHeader**

```tsx
// apps/mobile/components/SectionHeader.tsx
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
```

- [ ] **Step 5: Create Avatar**

```tsx
// apps/mobile/components/Avatar.tsx
import { View, Text } from "react-native";
import { useTheme } from "../lib/theme";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const theme = useTheme();
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.primaryLight,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontFamily: "Inter_600SemiBold", color: theme.primary }}>
        {initials}
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Create PrimaryButton**

```tsx
// apps/mobile/components/PrimaryButton.tsx
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  compact?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, loading, compact, disabled, style }: PrimaryButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: disabled ? theme.textMuted : theme.primary,
          borderRadius: 12,
          paddingVertical: compact ? 10 : 16,
          paddingHorizontal: compact ? 20 : 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator color="#fff" size="small" />}
      <Text style={{ fontSize: compact ? 13 : 15, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/
git commit -m "feat(mobile): add shared UI component library (StatCard, ListItem, StatusBadge, SectionHeader, Avatar, PrimaryButton)"
```

---

## Task 5: Root Layout — Fonts + ThemeProvider

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Add @expo-google-fonts/inter to package.json dependencies**

In `apps/mobile/package.json`, add to dependencies:
```json
"@expo-google-fonts/inter": "^0.2.3"
```

Then install:
```bash
cd "/Users/dineshlearning/Documents/make money/erp/.worktrees/feature/mobile-app-design"
pnpm install
```

- [ ] **Step 2: Rewrite root layout with font loading + ThemeProvider**

```tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "../lib/theme";
import type { Session } from "@supabase/supabase-js";
import "../global.css";

SplashScreen.preventAutoHideAsync();

async function tryRegisterPush(userId: string) {
  try {
    const { registerForPushNotifications } = await import("../lib/notifications");
    await registerForPushNotifications(userId);
  } catch {}
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [schoolId, setSchoolId] = useState<string | undefined>();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        tryRegisterPush(session.user.id);
        fetchSchoolId(session.user.id);
      }
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        tryRegisterPush(session.user.id);
        fetchSchoolId(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchSchoolId(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userId)
      .single();
    if (data?.school_id) setSchoolId(data.school_id);
  }

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single()
        .then(({ data }) => {
          if (data?.role === "teacher") {
            router.replace("/(teacher)/dashboard");
          } else {
            router.replace("/(parent)/dashboard");
          }
        });
    }
  }, [session, initialized, segments]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider schoolId={schoolId}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): load Inter font, wire ThemeProvider, hold splash until fonts ready"
```

---

## Task 6: Login Screen

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Rewrite login screen**

```tsx
import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert("Login failed", error.message);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="school" size={36} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Welcome back</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 4 }}>Sign in to continue</Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Email</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
              <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
              <TextInput style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }} placeholder="you@school.com" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
              <TextInput style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }} placeholder="••••••••" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} onPress={() => setShowPassword(!showPassword)} />
            </View>
          </View>

          <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} />
          <Text style={{ textAlign: "center", marginTop: 20, fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary }}>Forgot password?</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(auth)/login.tsx
git commit -m "feat(mobile): redesign login screen with Inter font + dynamic theme"
```

---

## Task 7: Parent Tab Navigator

**Files:**
- Modify: `apps/mobile/app/(parent)/_layout.tsx`

- [ ] **Step 1: Rewrite parent tab navigator (5 tabs)**

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";

export default function ParentLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="academics" options={{ title: "Academics", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: "Fees", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="results" options={{ href: null }} />
      <Tabs.Screen name="homework" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="feedback" options={{ href: null }} />
      <Tabs.Screen name="discipline" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/_layout.tsx
git commit -m "feat(mobile): parent tab navigator — 5 tabs with dynamic theme colors"
```

---

## Task 8: Parent Dashboard

**Files:**
- Modify: `apps/mobile/app/(parent)/dashboard.tsx`

- [ ] **Step 1: Rewrite parent dashboard**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatCard } from "../../components/StatCard";
import { SectionHeader } from "../../components/SectionHeader";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";

interface DashboardData {
  name: string;
  attendancePct: number;
  pendingFees: number;
  homeworkDue: number;
  announcements: { id: string; title: string; created_at: string }[];
}

export default function ParentDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [profileRes, attendanceRes, feesRes, homeworkRes, announcementsRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("attendance_records").select("status").eq("student_id", user.id),
      supabase.from("fee_payments").select("amount_due, amount_paid").eq("student_id", user.id).eq("status", "pending"),
      supabase.from("homework_assignments").select("id").gte("due_date", new Date().toISOString().split("T")[0]),
      supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
    ]);
    const totalDays = attendanceRes.data?.length ?? 0;
    const presentDays = attendanceRes.data?.filter((r) => r.status === "present").length ?? 0;
    const pendingFees = feesRes.data?.reduce((sum, r) => sum + (r.amount_due - r.amount_paid), 0) ?? 0;
    setData({
      name: profileRes.data?.full_name ?? "Student",
      attendancePct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      pendingFees,
      homeworkDue: homeworkRes.data?.length ?? 0,
      announcements: announcementsRes.data ?? [],
    });
    setLoading(false);
  }

  const quickActions = [
    { icon: "wallet-outline" as const, label: "Pay Fees", route: "/(parent)/fees" },
    { icon: "trophy-outline" as const, label: "Results", route: "/(parent)/academics" },
    { icon: "book-outline" as const, label: "Homework", route: "/(parent)/academics" },
    { icon: "megaphone-outline" as const, label: "News", route: "/(parent)/more" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
        {loading ? <Skeleton height={28} width="60%" /> : (
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            Good morning, {data?.name?.split(" ")[0]} 👋
          </Text>
        )}
        {loading ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0,1,2].map(i => <View key={i} style={{ flex: 1 }}><SkeletonCard /></View>)}
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard icon="checkmark-circle-outline" value={`${data?.attendancePct}%`} label="Attendance" />
            <StatCard icon="wallet-outline" value={`₹${((data?.pendingFees ?? 0) / 1000).toFixed(0)}k`} label="Pending" variant={data?.pendingFees ? "warning" : "default"} />
            <StatCard icon="book-outline" value={`${data?.homeworkDue}`} label="Due Today" variant={data?.homeworkDue ? "danger" : "default"} />
          </View>
        )}
        <View>
          <SectionHeader title="Quick Actions" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.label} onPress={() => router.push(action.route as any)} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }} activeOpacity={0.7}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={action.icon} size={20} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textSecondary, textAlign: "center" }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <SectionHeader title="Latest News" onSeeAll={() => router.push("/(parent)/more")} />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : data?.announcements.map((a) => (
            <View key={a.id} style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }}>{a.title}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted, marginTop: 4 }}>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/dashboard.tsx
git commit -m "feat(mobile): parent dashboard with stat cards, quick actions, announcements + skeletons"
```

---

## Task 9: Parent Attendance Screen

**Files:**
- Modify: `apps/mobile/app/(parent)/attendance.tsx`

- [ ] **Step 1: Rewrite attendance with calendar grid + monthly stats**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Skeleton } from "../../components/Skeleton";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

interface AttendanceRecord { date: string; status: "present" | "absent" | "late" }

export default function ParentAttendance() {
  const theme = useTheme();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const selectedYear = new Date().getFullYear();

  useEffect(() => { loadAttendance(); }, []);

  async function loadAttendance() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("attendance_records").select("date, status").eq("student_id", user.id).order("date");
    setRecords((data as AttendanceRecord[]) ?? []);
    setLoading(false);
  }

  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
  const present = monthRecords.filter((r) => r.status === "present").length;
  const absent = monthRecords.filter((r) => r.status === "absent").length;
  const total = monthRecords.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const statusMap = Object.fromEntries(monthRecords.map((r) => [r.date, r.status]));
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calendarCells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function getCellColor(day: number | null): string {
    if (!day) return "transparent";
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = statusMap[dateStr];
    if (status === "present") return theme.success;
    if (status === "absent") return theme.danger;
    if (status === "late") return theme.warning;
    return theme.border;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Attendance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity key={m} onPress={() => setSelectedMonth(i)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: selectedMonth === i ? theme.primary : theme.surface, borderWidth: 1, borderColor: selectedMonth === i ? theme.primary : theme.border }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: selectedMonth === i ? "#fff" : theme.textSecondary }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {loading ? <Skeleton height={100} borderRadius={16} /> : (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
            <Text style={{ fontSize: 48, fontFamily: "Inter_700Bold", color: theme.primary }}>{pct}%</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 4 }}>{present} present · {absent} absent · {total} days</Text>
          </View>
        )}
        {loading ? <Skeleton height={220} borderRadius={16} /> : (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {DAY_LABELS.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textMuted }}>{d}</Text>)}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarCells.map((day, i) => (
                <View key={i} style={{ width: `${100/7}%`, aspectRatio: 1, padding: 2 }}>
                  {day ? (
                    <View style={{ flex: 1, borderRadius: 6, backgroundColor: getCellColor(day), alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: getCellColor(day) === theme.border ? theme.textMuted : "#fff" }}>{day}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
          {[{ color: theme.success, label: "Present" }, { color: theme.danger, label: "Absent" }, { color: theme.warning, label: "Late" }].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: item.color }} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/attendance.tsx
git commit -m "feat(mobile): parent attendance with calendar grid, month selector, summary stats"
```

---

## Task 10: Parent Academics Screen (Results + Homework)

**Files:**
- Create: `apps/mobile/app/(parent)/academics.tsx`

- [ ] **Step 1: Create academics screen with segmented control**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

interface Result { id: string; subject: string; marks_obtained: number; total_marks: number; grade: string; term: string }
interface Homework { id: string; title: string; subject: string; due_date: string; status: string }

export default function ParentAcademics() {
  const theme = useTheme();
  const [tab, setTab] = useState<"results" | "homework">("results");
  const [results, setResults] = useState<Result[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [resultsRes, homeworkRes] = await Promise.all([
      supabase.from("results").select("id, subject, marks_obtained, total_marks, grade, term").eq("student_id", user.id).order("term"),
      supabase.from("homework_assignments").select("id, title, subject, due_date, status").order("due_date", { ascending: false }).limit(20),
    ]);
    setResults(resultsRes.data ?? []);
    setHomework(homeworkRes.data ?? []);
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Academics</Text>

        {/* Segmented control */}
        <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border }}>
          {(["results", "homework"] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: tab === t ? theme.primary : "transparent", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: tab === t ? "#fff" : theme.textSecondary, textTransform: "capitalize" }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
        ) : tab === "results" ? (
          <View style={{ gap: 8 }}>
            {results.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No results yet</Text>
            ) : results.map((r) => (
              <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.subject}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>{r.term}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.primary }}>{r.grade}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{r.marks_obtained}/{r.total_marks}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {homework.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No homework assigned</Text>
            ) : homework.map((h) => (
              <View key={h.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>{h.subject} · Due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                </View>
                <StatusBadge variant={h.status === "submitted" ? "paid" : new Date(h.due_date) < new Date() ? "overdue" : "pending"} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/academics.tsx
git commit -m "feat(mobile): parent academics screen with Results/Homework segmented control"
```

---

## Task 11: Parent Fees Screen

**Files:**
- Modify: `apps/mobile/app/(parent)/fees.tsx`

- [ ] **Step 1: Rewrite fees screen with balance card, breakdown, history, and receipt modal**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SectionHeader } from "../../components/SectionHeader";
import { SkeletonCard } from "../../components/Skeleton";

interface FeePayment {
  id: string;
  fee_type: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: "paid" | "pending" | "overdue";
  paid_at?: string;
  transaction_id?: string;
}

export default function ParentFees() {
  const theme = useTheme();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => { loadFees(); }, []);

  async function loadFees() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("fee_payments").select("id, fee_type, amount_due, amount_paid, due_date, status, paid_at, transaction_id").eq("student_id", user.id).order("due_date", { ascending: false });
    setPayments((data as FeePayment[]) ?? []);
    setLoading(false);
  }

  const totalDue = payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + (p.amount_due - p.amount_paid), 0);
  const nextDue = payments.filter((p) => p.status === "pending").sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  async function handlePayNow(payment: FeePayment) {
    setPayingId(payment.id);
    const amountPaise = (payment.amount_due - payment.amount_paid) * 100;
    const options = {
      description: payment.fee_type,
      currency: "INR",
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_placeholder",
      amount: amountPaise,
      name: "School ERP",
      prefill: { email: "", contact: "", name: "" },
      theme: { color: theme.primary },
    };
    try {
      const data = await RazorpayCheckout.open(options);
      await supabase.from("fee_payments").update({ status: "paid", amount_paid: payment.amount_due, paid_at: new Date().toISOString(), transaction_id: data.razorpay_payment_id }).eq("id", payment.id);
      loadFees();
    } catch (e: any) {
      if (e?.code !== "PAYMENT_CANCELLED") Alert.alert("Payment failed", e?.description ?? "Try again");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Fees</Text>

        {/* Balance card */}
        {loading ? <SkeletonCard /> : (
          <View style={{ backgroundColor: theme.primary, borderRadius: 20, padding: 24, gap: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Outstanding</Text>
            <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" }}>₹{totalDue.toLocaleString("en-IN")}</Text>
            {nextDue && (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" }}>
                Next due: {new Date(nextDue.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            )}
            {totalDue > 0 && nextDue && (
              <TouchableOpacity onPress={() => handlePayNow(nextDue)} style={{ backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.primary }}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Fee breakdown */}
        <View>
          <SectionHeader title="Fee Breakdown" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : payments.filter((p) => p.status !== "paid").map((p) => (
            <View key={p.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{p.fee_type}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>Due {new Date(p.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>₹{(p.amount_due - p.amount_paid).toLocaleString("en-IN")}</Text>
                <StatusBadge variant={p.status} />
              </View>
            </View>
          ))}
        </View>

        {/* Payment history */}
        <View>
          <SectionHeader title="Payment History" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : payments.filter((p) => p.status === "paid").length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>No payments yet</Text>
          ) : payments.filter((p) => p.status === "paid").map((p) => (
            <TouchableOpacity key={p.id} onPress={() => setReceipt(p)} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }} activeOpacity={0.7}>
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{p.fee_type}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 2 }}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: theme.success }}>₹{p.amount_paid.toLocaleString("en-IN")}</Text>
                <StatusBadge variant="paid" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Receipt modal */}
      <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={() => setReceipt(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Receipt</Text>
              <TouchableOpacity onPress={() => setReceipt(null)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {receipt && (
              <View style={{ gap: 12 }}>
                {[
                  { label: "Fee Type", value: receipt.fee_type },
                  { label: "Amount Paid", value: `₹${receipt.amount_paid.toLocaleString("en-IN")}` },
                  { label: "Date", value: receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                  { label: "Transaction ID", value: receipt.transaction_id ?? "—" },
                  { label: "Status", value: "Paid" },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
            <PrimaryButton label="Close" onPress={() => setReceipt(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/fees.tsx
git commit -m "feat(mobile): parent fees screen with balance card, breakdown, history + receipt modal"
```

---

## Task 12: Parent More Screen

**Files:**
- Create: `apps/mobile/app/(parent)/more.tsx`

- [ ] **Step 1: Create More screen (menu + inline Announcements, Discipline, Profile)**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { ListItem } from "../../components/ListItem";
import { Avatar } from "../../components/Avatar";
import { SectionHeader } from "../../components/SectionHeader";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonCard } from "../../components/Skeleton";

type Section = "menu" | "announcements" | "discipline" | "feedback" | "profile";

export default function ParentMore() {
  const theme = useTheme();
  const [section, setSection] = useState<Section>("menu");
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string }[]>([]);
  const [discipline, setDiscipline] = useState<{ id: string; incident_date: string; description: string; action_taken: string }[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    setProfile({ full_name: data?.full_name ?? "User", email: user.email ?? "" });
  }

  async function loadAnnouncements() {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(20);
    setAnnouncements(data ?? []);
    setLoading(false);
  }

  async function loadDiscipline() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("discipline_records").select("id, incident_date, description, action_taken").eq("student_id", user.id).order("incident_date", { ascending: false });
    setDiscipline(data ?? []);
    setLoading(false);
  }

  async function submitFeedback() {
    if (!feedback.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feedback").insert({ user_id: user?.id, message: feedback.trim() });
    setFeedback("");
    setSubmitting(false);
    Alert.alert("Submitted", "Your feedback has been received.");
  }

  function navigate(s: Section) {
    setSection(s);
    if (s === "announcements") loadAnnouncements();
    if (s === "discipline") loadDiscipline();
  }

  if (section !== "menu") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, gap: 12 }}>
          <TouchableOpacity onPress={() => setSection("menu")}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary, textTransform: "capitalize" }}>{section}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
          {section === "announcements" && (
            loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
            announcements.map((a) => (
              <View key={a.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{a.title}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{a.body}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
              </View>
            ))
          )}
          {section === "discipline" && (
            loading ? [0,1].map(i => <SkeletonCard key={i} />) :
            discipline.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No discipline records</Text>
            ) : discipline.map((d) => (
              <View key={d.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{new Date(d.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textPrimary }}>{d.description}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.warning }}>Action: {d.action_taken}</Text>
              </View>
            ))
          )}
          {section === "feedback" && (
            <View style={{ gap: 12 }}>
              <TextInput
                style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, minHeight: 120, textAlignVertical: "top" }}
                placeholder="Write your feedback..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={feedback}
                onChangeText={setFeedback}
              />
              <PrimaryButton label="Submit Feedback" onPress={submitFeedback} loading={submitting} />
            </View>
          )}
          {section === "profile" && profile && (
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: "center", gap: 12 }}>
                <Avatar name={profile.full_name} size={72} />
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{profile.full_name}</Text>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{profile.email}</Text>
              </View>
              <PrimaryButton label="Sign Out" onPress={async () => { await supabase.auth.signOut(); }} style={{ backgroundColor: theme.danger }} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>More</Text>
        {profile && (
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={profile.full_name} size={48} />
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{profile.full_name}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{profile.email}</Text>
            </View>
          </View>
        )}
        <View style={{ gap: 8 }}>
          <ListItem icon="megaphone-outline" title="Announcements" subtitle="School news & updates" onPress={() => navigate("announcements")} />
          <ListItem icon="shield-checkmark-outline" title="Discipline Records" subtitle="Incidents & actions" onPress={() => navigate("discipline")} />
          <ListItem icon="chatbubble-outline" title="Feedback" subtitle="Send feedback to school" onPress={() => navigate("feedback")} />
          <ListItem icon="person-outline" title="Profile" subtitle="Account settings" onPress={() => navigate("profile")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(parent)/more.tsx
git commit -m "feat(mobile): parent More screen with announcements, discipline, feedback, profile"
```

---

## Task 13: Teacher Tab Navigator

**Files:**
- Modify: `apps/mobile/app/(teacher)/_layout.tsx`

- [ ] **Step 1: Rewrite teacher tab navigator (5 tabs)**

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";

export default function TeacherLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="classes" options={{ title: "Classes", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "school" : "school-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="discipline" options={{ title: "Discipline", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "shield" : "shield-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="homework" options={{ href: null }} />
      <Tabs.Screen name="results" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/_layout.tsx
git commit -m "feat(mobile): teacher tab navigator — 5 tabs with dynamic theme colors"
```

---

## Task 14: Teacher Dashboard

**Files:**
- Modify: `apps/mobile/app/(teacher)/dashboard.tsx`

- [ ] **Step 1: Rewrite teacher dashboard (schedule + quick actions + pending tasks)**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { SectionHeader } from "../../components/SectionHeader";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";

interface TodayClass { id: string; period_number: number; subject: string; class_name: string; start_time: string; end_time: string }
interface PendingTask { id: string; label: string; count: number; route: string }

export default function TeacherDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const [profileRes, scheduleRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("timetable_periods").select("id, period_number, subject, class_name, start_time, end_time").eq("teacher_id", user.id).eq("day_of_week", today).order("period_number"),
    ]);
    setName(profileRes.data?.full_name ?? "Teacher");
    setTodayClasses(scheduleRes.data ?? []);
    setLoading(false);
  }

  const quickActions = [
    { icon: "checkmark-circle-outline" as const, label: "Attendance", route: "/(teacher)/attendance" },
    { icon: "book-outline" as const, label: "Homework", route: "/(teacher)/classes" },
    { icon: "trophy-outline" as const, label: "Results", route: "/(teacher)/classes" },
    { icon: "shield-outline" as const, label: "Discipline", route: "/(teacher)/discipline" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
        {loading ? <Skeleton height={28} width="60%" /> : (
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>
            Good morning, {name.split(" ")[0]} 👋
          </Text>
        )}

        {/* Today's schedule */}
        <View>
          <SectionHeader title="Today's Schedule" />
          {loading ? (
            <View style={{ gap: 8 }}><SkeletonCard /><SkeletonCard /></View>
          ) : todayClasses.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 20 }}>No classes today</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {todayClasses.map((c) => (
                  <View key={c.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, width: 140, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: theme.primary }}>P{c.period_number}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{c.subject}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{c.class_name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{c.start_time} – {c.end_time}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Quick actions */}
        <View>
          <SectionHeader title="Quick Actions" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.label} onPress={() => router.push(action.route as any)} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }} activeOpacity={0.7}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={action.icon} size={20} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textSecondary, textAlign: "center" }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/dashboard.tsx
git commit -m "feat(mobile): teacher dashboard with today's schedule + quick actions"
```

---

## Task 15: Teacher Attendance Screen (Full Rewrite)

**Files:**
- Modify: `apps/mobile/app/(teacher)/attendance.tsx`

- [ ] **Step 1: Rewrite teacher attendance — student list with 3-state toggle**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonCard } from "../../components/Skeleton";

type AttendanceStatus = "present" | "absent" | "late";

interface Student { id: string; full_name: string; roll_number: string }

export default function TeacherAttendance() {
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { loadClass(); }, []);

  async function loadClass() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase.from("user_roles").select("class_id").eq("user_id", user.id).eq("is_active", true).single();
    const cid = roleData?.class_id;
    setClassId(cid);

    if (!cid) { setLoading(false); return; }

    const { data: studentData } = await supabase
      .from("student_profiles")
      .select("student_id, roll_number, profiles(full_name)")
      .eq("class_id", cid)
      .order("roll_number");

    const studentList: Student[] = (studentData ?? []).map((s: any) => ({
      id: s.student_id,
      full_name: s.profiles?.full_name ?? "Student",
      roll_number: s.roll_number,
    }));

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("class_id", cid)
      .eq("date", today);

    const existingMap = Object.fromEntries((existing ?? []).map((r: any) => [r.student_id, r.status as AttendanceStatus]));
    const defaultStatuses = Object.fromEntries(studentList.map((s) => [s.id, existingMap[s.id] ?? "present" as AttendanceStatus]));

    setStudents(studentList);
    setStatuses(defaultStatuses);
    setLoading(false);
  }

  function cycleStatus(studentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatuses((prev) => {
      const current = prev[studentId] ?? "present";
      const next: AttendanceStatus = current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  }

  function markAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  async function saveAttendance() {
    if (!classId) return;
    setSaving(true);
    const records = students.map((s) => ({
      student_id: s.id,
      class_id: classId,
      date: today,
      status: statuses[s.id] ?? "present",
    }));
    const { error } = await supabase.from("attendance_records").upsert(records, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Saved", "Attendance recorded successfully.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 20, gap: 4 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Mark Attendance</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Text>
        </View>

        {/* Bulk actions */}
        {!loading && students.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => markAll("present")} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.success + "1A", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.success }}>All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => markAll("absent")} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.danger + "1A", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.danger }}>All Absent</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student list */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 100 }}>
          {loading ? (
            [0,1,2,3,4].map(i => <SkeletonCard key={i} />)
          ) : students.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 40 }}>No students found for your class</Text>
          ) : students.map((student) => (
            <TouchableOpacity key={student.id} onPress={() => cycleStatus(student.id)} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }} activeOpacity={0.7}>
              <Avatar name={student.full_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{student.full_name}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>Roll #{student.roll_number}</Text>
              </View>
              <StatusBadge variant={statuses[student.id] ?? "present"} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sticky submit */}
        {!loading && students.length > 0 && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
            <PrimaryButton label={`Save Attendance (${students.length} students)`} onPress={saveAttendance} loading={saving} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/attendance.tsx
git commit -m "feat(mobile): teacher attendance rewrite — 3-state toggle, bulk actions, upsert"
```

---

## Task 16: Teacher Classes Screen (Homework + Results)

**Files:**
- Create: `apps/mobile/app/(teacher)/classes.tsx`

- [ ] **Step 1: Create classes screen with segmented Homework/Results**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonCard } from "../../components/Skeleton";

type Tab = "homework" | "results";

interface HomeworkItem { id: string; title: string; subject: string; due_date: string; class_name: string }
interface ResultItem { id: string; student_name: string; subject: string; marks_obtained: number; total_marks: number; grade: string }

export default function TeacherClasses() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>("homework");
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [newHW, setNewHW] = useState({ title: "", subject: "", due_date: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase.from("user_roles").select("class_id, school_id").eq("user_id", user.id).eq("is_active", true).single();

    const [hwRes, resultsRes] = await Promise.all([
      supabase.from("homework_assignments").select("id, title, subject, due_date, class_name").eq("teacher_id", user.id).order("due_date", { ascending: false }).limit(20),
      supabase.from("results").select("id, subject, marks_obtained, total_marks, grade, profiles(full_name)").eq("teacher_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);

    setHomework(hwRes.data ?? []);
    setResults((resultsRes.data ?? []).map((r: any) => ({ ...r, student_name: r.profiles?.full_name ?? "Student" })));
    setLoading(false);
  }

  async function addHomework() {
    if (!newHW.title.trim() || !newHW.subject.trim() || !newHW.due_date.trim()) {
      Alert.alert("Missing fields", "Please fill in title, subject and due date.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roleData } = await supabase.from("user_roles").select("class_id, school_id").eq("user_id", user?.id).eq("is_active", true).single();
    await supabase.from("homework_assignments").insert({
      title: newHW.title.trim(),
      subject: newHW.subject.trim(),
      due_date: newHW.due_date.trim(),
      description: newHW.description.trim(),
      teacher_id: user?.id,
      class_id: roleData?.class_id,
      school_id: roleData?.school_id,
    });
    setSaving(false);
    setShowAddHomework(false);
    setNewHW({ title: "", subject: "", due_date: "", description: "" });
    loadData();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Classes</Text>
        {tab === "homework" && (
          <TouchableOpacity onPress={() => setShowAddHomework(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={22} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 12, margin: 20, marginTop: 0, padding: 4, borderWidth: 1, borderColor: theme.border }}>
        {(["homework", "results"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: tab === t ? theme.primary : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: tab === t ? "#fff" : theme.textSecondary, textTransform: "capitalize" }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 20 }}>
        {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
          tab === "homework" ? (
            homework.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No homework assigned</Text>
            ) : homework.map((h) => (
              <View key={h.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 4 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{h.title}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{h.subject} · {h.class_name}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textMuted }}>Due {new Date(h.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
            ))
          ) : (
            results.length === 0 ? (
              <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 32 }}>No results entered</Text>
            ) : results.map((r) => (
              <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.student_name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{r.subject}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.primary }}>{r.grade}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{r.marks_obtained}/{r.total_marks}</Text>
                </View>
              </View>
            ))
          )
        }
      </ScrollView>

      {/* Add Homework Modal */}
      <Modal visible={showAddHomework} transparent animationType="slide" onRequestClose={() => setShowAddHomework(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Add Homework</Text>
              <TouchableOpacity onPress={() => setShowAddHomework(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              { key: "title", placeholder: "Title", label: "Title" },
              { key: "subject", placeholder: "e.g. Mathematics", label: "Subject" },
              { key: "due_date", placeholder: "YYYY-MM-DD", label: "Due Date" },
              { key: "description", placeholder: "Optional description", label: "Description" },
            ].map((field) => (
              <View key={field.key}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 4 }}>{field.label}</Text>
                <TextInput
                  style={{ backgroundColor: theme.surfaceRaised, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textMuted}
                  value={(newHW as any)[field.key]}
                  onChangeText={(v) => setNewHW((prev) => ({ ...prev, [field.key]: v }))}
                />
              </View>
            ))}
            <PrimaryButton label="Add Homework" onPress={addHomework} loading={saving} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/classes.tsx
git commit -m "feat(mobile): teacher classes screen with Homework/Results tabs + add homework modal"
```

---

## Task 17: Teacher Discipline Screen

**Files:**
- Modify: `apps/mobile/app/(teacher)/discipline.tsx`

- [ ] **Step 1: Rewrite discipline screen with log + history**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonCard } from "../../components/Skeleton";

interface DisciplineRecord { id: string; student_name: string; incident_date: string; description: string; action_taken: string }

export default function TeacherDiscipline() {
  const theme = useTheme();
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_name: "", description: "", action_taken: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("discipline_records").select("id, incident_date, description, action_taken, profiles(full_name)").eq("teacher_id", user.id).order("incident_date", { ascending: false }).limit(30);
    setRecords((data ?? []).map((r: any) => ({ ...r, student_name: r.profiles?.full_name ?? "Student" })));
    setLoading(false);
  }

  async function addRecord() {
    if (!form.student_name.trim() || !form.description.trim() || !form.action_taken.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roleData } = await supabase.from("user_roles").select("class_id, school_id").eq("user_id", user?.id).eq("is_active", true).single();
    await supabase.from("discipline_records").insert({
      description: form.description.trim(),
      action_taken: form.action_taken.trim(),
      incident_date: new Date().toISOString().split("T")[0],
      teacher_id: user?.id,
      school_id: roleData?.school_id,
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ student_name: "", description: "", action_taken: "" });
    loadRecords();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Discipline</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 20 }}>
        {loading ? [0,1,2].map(i => <SkeletonCard key={i} />) :
          records.length === 0 ? (
            <Text style={{ textAlign: "center", color: theme.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 40 }}>No discipline records</Text>
          ) : records.map((r) => (
            <View key={r.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.textPrimary }}>{r.student_name}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: theme.textMuted }}>{new Date(r.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{r.description}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.warning }} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.warning }}>{r.action_taken}</Text>
              </View>
            </View>
          ))
        }
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Log Incident</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={theme.textMuted} /></TouchableOpacity>
            </View>
            {[
              { key: "student_name", label: "Student Name", placeholder: "Full name" },
              { key: "description", label: "Incident Description", placeholder: "What happened?" },
              { key: "action_taken", label: "Action Taken", placeholder: "e.g. Warning issued" },
            ].map((f) => (
              <View key={f.key}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 4 }}>{f.label}</Text>
                <TextInput
                  style={{ backgroundColor: theme.surfaceRaised, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary }}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.textMuted}
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  multiline={f.key !== "student_name"}
                />
              </View>
            ))}
            <PrimaryButton label="Log Incident" onPress={addRecord} loading={saving} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/discipline.tsx
git commit -m "feat(mobile): teacher discipline screen with history + log incident modal"
```

---

## Task 18: Teacher Profile Screen

**Files:**
- Modify: `apps/mobile/app/(teacher)/profile.tsx`

- [ ] **Step 1: Rewrite teacher profile**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { ListItem } from "../../components/ListItem";
import { PrimaryButton } from "../../components/PrimaryButton";

interface Profile { full_name: string; email: string; school_name: string }

export default function TeacherProfile() {
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, school_id, schools(name)")
      .eq("id", user.id)
      .single();
    setProfile({
      full_name: data?.full_name ?? "Teacher",
      email: user.email ?? "",
      school_name: (data as any)?.schools?.name ?? "School",
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Profile</Text>
        {profile && (
          <>
            <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: "center", gap: 12 }}>
              <Avatar name={profile.full_name} size={80} />
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>{profile.full_name}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>{profile.email}</Text>
              <View style={{ backgroundColor: theme.primaryLight, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: theme.primary }}>Teacher · {profile.school_name}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <ListItem icon="school-outline" title={profile.school_name} subtitle="Your school" />
              <ListItem icon="mail-outline" title={profile.email} subtitle="Email address" />
            </View>
            <PrimaryButton label="Sign Out" onPress={async () => { await supabase.auth.signOut(); }} style={{ backgroundColor: theme.danger }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(teacher)/profile.tsx
git commit -m "feat(mobile): teacher profile screen with avatar, school info, sign out"
```

---

## Task 19: Cleanup — Delete Merged Screens

**Files to delete:**
- `apps/mobile/app/(parent)/results.tsx`
- `apps/mobile/app/(parent)/homework.tsx`
- `apps/mobile/app/(parent)/announcements.tsx`
- `apps/mobile/app/(parent)/feedback.tsx`
- `apps/mobile/app/(parent)/discipline.tsx`
- `apps/mobile/app/(parent)/profile.tsx`
- `apps/mobile/app/(teacher)/homework.tsx`
- `apps/mobile/app/(teacher)/results.tsx`

- [ ] **Step 1: Delete merged screens**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/.worktrees/feature/mobile-app-design/apps/mobile"
rm app/\(parent\)/results.tsx app/\(parent\)/homework.tsx app/\(parent\)/announcements.tsx app/\(parent\)/feedback.tsx app/\(parent\)/discipline.tsx app/\(parent\)/profile.tsx
rm app/\(teacher\)/homework.tsx app/\(teacher\)/results.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore(mobile): remove screens merged into academics, more, and classes tabs"
```

---

## Task 20: Type Check + Final Verification

- [ ] **Step 1: Run type check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/.worktrees/feature/mobile-app-design/apps/mobile"
pnpm type-check
```

Expected: no TypeScript errors. Fix any that appear before proceeding.

- [ ] **Step 2: Start dev server and verify no runtime errors**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/.worktrees/feature/mobile-app-design/apps/mobile"
pnpm dev
```

Open Expo Go or simulator. Verify:
- Login screen renders with Inter font + icon
- Parent dashboard loads with skeleton → real data
- Parent tabs show: Home · Attendance · Academics · Fees · More
- Teacher tabs show: Home · Attendance · Classes · Discipline · Profile
- No red screen errors in console

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete UI redesign — fintech design system, dynamic theming, Inter font, skeleton states"
```

---

## Stitch Design References

Mockups saved in `stitch-designs/mobile-app-design/`:
- `01-parent-dashboard.html` → Task 8
- `02-login-screen.html` → Task 6
- `03-attendance-parent.html` → Task 9
- `04-teacher-dashboard.html` → Task 14
- `05-more-screen.html` → Task 12
- `06-mark-attendance-teacher.html` → Task 15
- `07-fees-screen.html` → Task 11
- `00-design-brief.md` → Tasks 2–4 (design tokens)

