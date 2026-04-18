import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { DataTable } from "@/components/data-table";
import { UploadSyllabusForm } from "./upload-syllabus-form";

export default async function SyllabusPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: syllabusEntries } = await supabase
    .from("syllabus")
    .select("id, file_url, class:classes(name), subject:subjects(name), academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("order");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, class_id")
    .eq("school_id", schoolId)
    .order("name");

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const rows = (syllabusEntries ?? []).map((s) => {
    const cls = (s.class as unknown as { name: string } | null);
    const subject = (s.subject as unknown as { name: string } | null);
    const ay = (s.academic_year as unknown as { name: string } | null);
    return {
      id: s.id,
      class_name: cls?.name ?? "—",
      subject_name: subject?.name ?? "—",
      academic_year: ay?.name ?? "—",
      file_url: s.file_url ?? "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Syllabus</h1>
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <UploadSyllabusForm
          schoolId={schoolId}
          classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
          subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name, classId: s.class_id }))}
          academicYears={(academicYears ?? []).map((y) => ({ id: y.id, name: y.name }))}
        />
      </div>
      <DataTable
        data={rows}
        columns={[
          { header: "Class", accessor: "class_name" },
          { header: "Subject", accessor: "subject_name" },
          { header: "Academic Year", accessor: "academic_year" },
          {
            header: "File",
            accessor: (row) =>
              row.file_url !== "—" ? (
                <a
                  href={row.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View
                </a>
              ) : (
                "—"
              ),
          },
        ]}
        emptyMessage="No syllabus entries yet."
      />
    </div>
  );
}
