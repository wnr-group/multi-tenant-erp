import { Upload } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { UploadSyllabusForm } from "./upload-syllabus-form";

export default async function SyllabusPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [
    { data: syllabusEntries },
    { data: classes },
    { data: subjects },
    { data: academicYears },
  ] = await Promise.all([
    supabase
      .from("syllabus")
      .select(
        "id, file_url, class:classes(name), subject:subjects(name), academic_year:academic_years(name)"
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("subjects")
      .select("id, name, class_id")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("academic_years")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
  ]);

  const rows = (syllabusEntries ?? []).map((s) => {
    const cls = s.class as unknown as { name: string } | null;
    const subject = s.subject as unknown as { name: string } | null;
    const ay = s.academic_year as unknown as { name: string } | null;
    return {
      id: s.id,
      class_name: cls?.name ?? "—",
      subject_name: subject?.name ?? "—",
      academic_year: ay?.name ?? "—",
      file_url: s.file_url ?? "",
    };
  });

  const filesUploaded = rows.length;
  const classesCovered = new Set(
    rows.filter((r) => r.class_name !== "—").map((r) => r.class_name)
  ).size;

  const uniqueYears = Array.from(
    new Set(rows.filter((r) => r.academic_year !== "—").map((r) => r.academic_year))
  );

  const classesData = (classes ?? []).map((c) => ({ id: c.id, name: c.name }));
  const subjectsData = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    classId: s.class_id,
  }));
  const academicYearsData = (academicYears ?? []).map((y) => ({
    id: y.id,
    name: y.name,
  }));

  const uploadForm = (onSuccess: () => void) => (
    <UploadSyllabusForm
      schoolId={schoolId}
      classes={classesData}
      subjects={subjectsData}
      academicYears={academicYearsData}
      onSuccess={onSuccess}
    />
  );

  return (
    <div>
      <PageHeader
        title="Syllabus"
        description="Upload and manage syllabus files by class and subject."
        stats={[
          { label: "Files Uploaded", value: filesUploaded },
          { label: "Classes Covered", value: classesCovered },
        ]}
        action={
          <ActionDialog trigger="+ Upload Syllabus" title="Upload Syllabus">
            {uploadForm}
          </ActionDialog>
        }
      />

      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Class", accessor: "class_name" },
          { header: "Subject", accessor: "subject_name" },
          { header: "Academic Year", accessor: "academic_year" },
          {
            header: "File",
            accessor: (row) =>
              row.file_url ? (
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
        searchKeys={["class_name", "subject_name"]}
        searchPlaceholder="Search by class or subject..."
        filter={
          uniqueYears.length > 0
            ? {
                label: "All Years",
                options: uniqueYears.map((y) => ({ value: y, label: y })),
                filterFn: (row, value) => row.academic_year === value,
              }
            : undefined
        }
        emptyState={
          <EmptyState
            icon={Upload}
            title="No syllabus files yet"
            description="Upload syllabus PDFs for each class and subject."
            action={
              <ActionDialog trigger="+ Upload Syllabus" title="Upload Syllabus">
                {uploadForm}
              </ActionDialog>
            }
          />
        }
      />
    </div>
  );
}
