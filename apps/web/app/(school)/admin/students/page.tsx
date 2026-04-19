import Link from "next/link";
import { GraduationCap, MoreHorizontal } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { AddStudentForm } from "./add-student-form";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, roll_number, admission_number, profile:profiles(full_name, email), class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (students ?? []).map((s) => {
    const p = s.profile as unknown as { full_name: string } | null;
    const c = s.class as unknown as { name: string } | null;
    const sec = s.section as unknown as { name: string } | null;
    return {
      id: s.id,
      name: p?.full_name ?? "",
      roll: s.roll_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
    };
  });

  type StudentRow = (typeof rows)[number];

  const columns: { header: string; accessor: keyof StudentRow | ((row: StudentRow) => React.ReactNode) }[] = [
    { header: "Name", accessor: "name" },
    { header: "Roll No.", accessor: "roll" },
    { header: "Class", accessor: "class_name" },
    { header: "Section", accessor: "section" },
  ];

  const classFilterOptions = (classes ?? []).map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const emptyState = (
    <EmptyState
      icon={GraduationCap}
      title="No students yet"
      description="Add your first student to get started with enrollment."
    />
  );

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student enrollment and profiles."
        action={
          <ActionDialog trigger="+ Add Student" title="Add Student">
            {(onSuccess) => (
              <AddStudentForm
                schoolId={schoolId}
                classes={classes ?? []}
                onSuccess={onSuccess}
              />
            )}
          </ActionDialog>
        }
        stats={[
          { label: "Total Students", value: rows.length },
          { label: "Classes", value: (classes ?? []).length },
        ]}
      />

      <FilterableDataTable
        data={rows}
        columns={columns}
        searchKeys={["name", "roll"]}
        searchPlaceholder="Search by name or roll number…"
        filter={
          classFilterOptions.length > 0
            ? {
                label: "All Classes",
                options: classFilterOptions,
                filterFn: (row: StudentRow, value: string) =>
                  row.class_name === value,
              }
            : undefined
        }
        renderActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Row actions" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={
                  <Link href={`/admin/students/${row.id}`} />
                }
              >
                View Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyState={emptyState}
      />
    </div>
  );
}
