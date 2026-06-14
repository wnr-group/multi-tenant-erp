import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, SCHOOL_ID } from "./supabase";

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

    // A user may hold several role rows (e.g. teacher + parent, or roles in
    // multiple schools). This build is scoped to SCHOOL_ID, so resolve the
    // teacher role for THIS school rather than assuming a single row.
    const roleRes = await supabase
      .from("user_roles")
      .select("school_id")
      .eq("user_id", user.id)
      .eq("school_id", SCHOOL_ID)
      .eq("role", "teacher")
      .eq("is_active", true)
      .maybeSingle();

    const sid = roleRes.data?.school_id ?? SCHOOL_ID;
    setSchoolId(sid);

    // Resolve the active academic year
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", sid)
      .eq("status", "active")
      .maybeSingle();
    const activeYearId = activeYear?.id;

    // Fetch homeroom sections from section_assignments for the active year
    let saQuery = supabase
      .from("section_assignments")
      .select("section_id")
      .eq("class_teacher_id", user.id)
      .eq("school_id", sid);
    if (activeYearId) saQuery = saQuery.eq("academic_year_id", activeYearId);
    const { data: saRows } = await saQuery;

    const homeroomIds = new Set<string>((saRows ?? []).map((r: any) => r.section_id));

    // All distinct sections this teacher has timetable entries for (current year)
    let ttQuery = supabase
      .from("timetable")
      .select("section_id, sections(id, name, class_id, classes(name))")
      .eq("teacher_id", user.id)
      .eq("school_id", sid);
    if (activeYearId) ttQuery = ttQuery.eq("academic_year_id", activeYearId);
    const { data: ttRows } = await ttQuery;

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
        isHomeroom: homeroomIds.has(sec.id),
      });
    });

    // If any homeroom section is not in timetable, add it separately
    for (const homeroomId of homeroomIds) {
      if (seen.has(homeroomId)) continue;
      const { data: sec } = await supabase
        .from("sections")
        .select("id, name, class_id, classes(name)")
        .eq("id", homeroomId)
        .single();
      if (sec) {
        seen.add(sec.id);
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
    // Default to first homeroom if available, else first section
    const defaultId = built.find((s) => s.isHomeroom)?.id ?? built[0]?.id ?? "";
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
