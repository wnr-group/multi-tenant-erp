import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { AddAcademicYearForm } from "./add-academic-year-form";
import { AddExamForm } from "./add-exam-form";

export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const years = academicYears ?? [];
  const currentYear = years.find((y) => y.is_current);

  const yearRows = years.map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    is_current: y.is_current ?? false,
  }));

  const examRows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start: e.start_date ?? "—",
      end: e.end_date ?? "—",
    };
  });

  return (
    <div className="space-y-10">
      {/* Academic Years section */}
      <section>
        <PageHeader
          title="Academics"
          description="Manage academic years and exams for your school."
          action={
            <ActionDialog trigger="+ Add Academic Year" title="Add Academic Year">
              {(onSuccess) => (
                <AddAcademicYearForm schoolId={schoolId} onSuccess={onSuccess} />
              )}
            </ActionDialog>
          }
          stats={[
            { label: "Academic Years", value: years.length },
            { label: "Current Year", value: currentYear?.name ?? "—" },
            { label: "Exams", value: (exams ?? []).length },
          ]}
        />

        <FilterableDataTable
          data={yearRows}
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Start", accessor: "start" },
            { header: "End", accessor: "end" },
            {
              header: "Status",
              accessor: (row) =>
                row.is_current ? (
                  <Badge variant="default">Current</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                ),
            },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search academic years…"
          emptyState={
            <EmptyState
              icon={Calendar}
              title="No academic years yet"
              description="Add your first academic year to get started."
            />
          }
        />
      </section>

      {/* Exams section */}
      <section>
        <PageHeader
          title="Exams"
          description="Track all exams across academic years."
          action={
            <ActionDialog trigger="+ Add Exam" title="Add Exam">
              {(onSuccess) => (
                <AddExamForm
                  schoolId={schoolId}
                  academicYears={years.map((y) => ({ id: y.id, name: y.name }))}
                  onSuccess={onSuccess}
                />
              )}
            </ActionDialog>
          }
        />

        <FilterableDataTable
          data={examRows}
          columns={[
            { header: "Exam Name", accessor: "name" },
            { header: "Academic Year", accessor: "academic_year" },
            { header: "Start", accessor: "start" },
            { header: "End", accessor: "end" },
          ]}
          searchKeys={["name"]}
          searchPlaceholder="Search exams…"
          emptyState={
            <EmptyState
              icon={Calendar}
              title="No exams yet"
              description="Add your first exam to get started."
            />
          }
        />
      </section>
    </div>
  );
}
