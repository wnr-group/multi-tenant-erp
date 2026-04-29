import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";

export interface SectionInfo {
  id: string;
  label: string;   // e.g. "Class 8 A"
  shortLabel: string; // e.g. "8A"
  classId: string;
  isHomeroom: boolean;
}

export interface TeacherContextValue {
  sections: SectionInfo[];
  activeSection: SectionInfo | null;
  setActiveSectionId: (id: string) => void;
  userId: string;
  schoolId: string;
  ready: boolean;
}

const TeacherContext = createContext<TeacherContextValue>({
  sections: [],
  activeSection: null,
  setActiveSectionId: () => {},
  userId: "",
  schoolId: "",
  ready: false,
});

export function TeacherContextProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [userId, setUserId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => { loadContext(); }, []);

  async function loadContext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [roleRes, tpRes] = await Promise.all([
      supabase.from("user_roles").select("school_id").eq("user_id", user.id).eq("is_active", true).single(),
      supabase.from("teacher_profiles").select("class_teacher_of").eq("profile_id", user.id).single(),
    ]);

    const sid = roleRes.data?.school_id ?? "";
    setSchoolId(sid);
    const homeroomId = tpRes.data?.class_teacher_of ?? null;

    // All distinct sections this teacher has timetable entries for
    const { data: ttRows } = await supabase
      .from("timetable")
      .select("section_id, sections(id, name, class_id, classes(name))")
      .eq("teacher_id", user.id)
      .eq("school_id", sid);

    // Deduplicate by section_id
    const seen = new Set<string>();
    const built: SectionInfo[] = [];

    (ttRows ?? []).forEach((row: any) => {
      const sec = row.sections;
      if (!sec || seen.has(sec.id)) return;
      seen.add(sec.id);
      const className = sec.classes?.name ?? "";
      // Extract number from "Class 8" → "8"
      const classNum = className.replace(/[^0-9]/g, "");
      built.push({
        id: sec.id,
        label: `${className} ${sec.name}`.trim(),
        shortLabel: classNum ? `${classNum}${sec.name}` : `${className}${sec.name}`,
        classId: sec.class_id,
        isHomeroom: sec.id === homeroomId,
      });
    });

    // If homeroom is not in timetable, add it separately
    if (homeroomId && !seen.has(homeroomId)) {
      const { data: sec } = await supabase
        .from("sections")
        .select("id, name, class_id, classes(name)")
        .eq("id", homeroomId)
        .single();
      if (sec) {
        const className = (sec as any).classes?.name ?? "";
        const classNum = className.replace(/[^0-9]/g, "");
        built.unshift({
          id: sec.id,
          label: `${className} ${sec.name}`.trim(),
          shortLabel: classNum ? `${classNum}${sec.name}` : `${className}${sec.name}`,
          classId: sec.class_id,
          isHomeroom: true,
        });
      }
    }

    // Sort: homeroom first, then by label
    built.sort((a, b) => {
      if (a.isHomeroom && !b.isHomeroom) return -1;
      if (!a.isHomeroom && b.isHomeroom) return 1;
      return a.label.localeCompare(b.label);
    });

    setSections(built);
    // Default to homeroom if available, else first section
    const defaultId = homeroomId && seen.has(homeroomId)
      ? homeroomId
      : built[0]?.id ?? "";
    setActiveSectionId(defaultId);
    setReady(true);
  }

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;

  return (
    <TeacherContext.Provider value={{ sections, activeSection, setActiveSectionId, userId, schoolId, ready }}>
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacherContext(): TeacherContextValue {
  return useContext(TeacherContext);
}
