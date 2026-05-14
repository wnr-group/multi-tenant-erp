import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface ImportRow {
  full_name: string;
  email?: string;
  roll_number?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  parent_phone?: string;
}

interface RowResult {
  row: number;
  status: "created" | "updated" | "error";
  error?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "school_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { rows } = (await request.json()) as { rows: ImportRow[] };

  const { data: classes } = await adminClient
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId);

  const { data: sections } = await adminClient
    .from("sections")
    .select("id, name, class_id")
    .eq("school_id", schoolId);

  const classMap = new Map<string, string>();
  for (const cls of classes ?? []) {
    classMap.set(cls.name.toLowerCase().trim(), cls.id);
  }

  const sectionMap = new Map<string, string>();
  for (const sec of sections ?? []) {
    sectionMap.set(`${sec.class_id}:${sec.name.toLowerCase().trim()}`, sec.id);
  }

  const results: RowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.full_name?.trim()) {
        throw new Error("Missing full_name");
      }

      const className = row.class_name?.toLowerCase().trim() ?? "";
      const sectionName = row.section_name?.toLowerCase().trim() ?? "";
      const classId = className ? classMap.get(className) : undefined;
      const sectionId = classId && sectionName
        ? sectionMap.get(`${classId}:${sectionName}`)
        : undefined;

      const record = {
        school_id: schoolId,
        full_name: row.full_name.trim(),
        email: row.email?.trim() || null,
        roll_number: row.roll_number?.trim() || null,
        admission_number: row.admission_number?.trim() || null,
        class_id: classId ?? null,
        section_id: sectionId ?? null,
        parent_phone: row.parent_phone?.trim() || null,
      };

      if (row.admission_number?.trim()) {
        const { data: existing } = await adminClient
          .from("student_profiles")
          .select("id")
          .eq("school_id", schoolId)
          .eq("admission_number", row.admission_number.trim())
          .maybeSingle();

        if (existing) {
          const { error } = await adminClient
            .from("student_profiles")
            .update(record)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          results.push({ row: i, status: "updated" });
        } else {
          const { error } = await adminClient
            .from("student_profiles")
            .insert(record);
          if (error) throw new Error(error.message);
          results.push({ row: i, status: "created" });
        }
      } else {
        const { error } = await adminClient
          .from("student_profiles")
          .insert(record);
        if (error) throw new Error(error.message);
        results.push({ row: i, status: "created" });
      }
    } catch (err) {
      results.push({
        row: i,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
