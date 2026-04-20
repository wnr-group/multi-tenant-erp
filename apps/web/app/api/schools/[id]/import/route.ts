import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ImportRow {
  full_name: string;
  email: string;
  roll_number?: string;
  class_name?: string;
  section_name?: string;
  student_email?: string;
}

interface ImportBody {
  role: string;
  rows: ImportRow[];
}

interface RowResult {
  row: number;
  status: "ok" | "error";
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth check — super_admin only
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

  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Get schoolId from params
  const { id: schoolId } = await params;

  // 3. Create admin client with service role
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 4. Look up school domain/name for invite redirect
  const { data: school } = await adminClient
    .from("schools")
    .select("domain, name")
    .eq("id", schoolId)
    .single();

  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol =
    host.includes("localhost") || host.includes("lvh.me") ? "http" : "https";
  const redirectTo = school?.domain
    ? `${protocol}://${school.domain}${port}/invite`
    : undefined;

  const { role, rows } = (await request.json()) as ImportBody;

  // 5. Pre-fetch classes and sections for student imports
  let classMap = new Map<string, string>();
  let sectionMap = new Map<string, string>();

  if (role === "student") {
    const { data: classes } = await adminClient
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId);

    if (classes) {
      for (const cls of classes) {
        classMap.set(cls.name.toLowerCase(), cls.id);
      }
    }

    const { data: sections } = await adminClient
      .from("sections")
      .select("id, name, class_id")
      .eq("school_id", schoolId);

    if (sections) {
      for (const sec of sections) {
        sectionMap.set(`${sec.class_id}:${sec.name.toLowerCase()}`, sec.id);
      }
    }
  }

  // 6. Process each row sequentially
  const results: RowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // a. Invite user by email
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(row.email, {
          data: {
            full_name: row.full_name,
            invited_role: role,
            school_name: school?.name ?? "School",
          },
          redirectTo,
        });

      if (inviteError || !inviteData?.user) {
        throw new Error(inviteError?.message ?? "Failed to invite user");
      }

      const userId = inviteData.user.id;

      // b. Insert user_roles
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, school_id: schoolId, role });
      if (roleError) throw new Error(`user_roles: ${roleError.message}`);

      // c. Update profiles
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ school_id: schoolId, full_name: row.full_name })
        .eq("id", userId);
      if (profileError) throw new Error(`profiles: ${profileError.message}`);

      // d. Student-specific insert
      if (role === "student") {
        const className = row.class_name?.toLowerCase() ?? "";
        const sectionName = row.section_name?.toLowerCase() ?? "";
        const classId = classMap.get(className);
        if (!classId) throw new Error(`Class not found: ${row.class_name}`);
        const sectionId = sectionMap.get(`${classId}:${sectionName}`);
        if (!sectionId) throw new Error(`Section not found: ${row.section_name}`);

        const { error: studentError } = await adminClient
          .from("student_profiles")
          .insert({
            profile_id: userId,
            school_id: schoolId,
            class_id: classId,
            section_id: sectionId,
            roll_number: row.roll_number ?? null,
          });
        if (studentError) throw new Error(`student_profiles: ${studentError.message}`);
      }

      // e. Teacher-specific insert
      if (role === "teacher") {
        const { error: teacherError } = await adminClient
          .from("teacher_profiles")
          .insert({ profile_id: userId, school_id: schoolId });
        if (teacherError) throw new Error(`teacher_profiles: ${teacherError.message}`);
      }

      results.push({ row: i, status: "ok" });
    } catch (err) {
      results.push({
        row: i,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 7. Return results
  return NextResponse.json({ results });
}
