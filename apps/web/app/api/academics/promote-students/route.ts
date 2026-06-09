import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface PromotionRow {
  studentProfileId: string;
  targetClassId: string;
  targetSectionId: string;
  rollNumber?: string;
}

export async function POST(request: NextRequest) {
  const { draftYearId, promotions }: { draftYearId: string; promotions: PromotionRow[] } = await request.json();
  if (!draftYearId || !promotions?.length) {
    return NextResponse.json({ error: "draftYearId and promotions required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = promotions.map((p) => ({
    student_profile_id: p.studentProfileId,
    academic_year_id: draftYearId,
    school_id: schoolId,
    class_id: p.targetClassId,
    section_id: p.targetSectionId,
    roll_number: p.rollNumber ?? null,
    is_active: true,
  }));

  // Deactivate old enrollments for these students (any year)
  const studentIds = promotions.map((p) => p.studentProfileId);
  await supabase
    .from("student_enrollments")
    .update({ is_active: false })
    .eq("school_id", schoolId)
    .in("student_profile_id", studentIds)
    .neq("academic_year_id", draftYearId);

  // Create new enrollments for the draft year
  const { error } = await supabase
    .from("student_enrollments")
    .upsert(rows, { onConflict: "student_profile_id,academic_year_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promoted: rows.length });
}
