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
    primaryLight: primary + "26",
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
