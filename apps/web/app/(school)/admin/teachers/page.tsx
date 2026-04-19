import Link from "next/link";
import { Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { PageHeader } from "@/components/page-header";
import { ActionDialog } from "@/components/action-dialog";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { InviteTeacherForm } from "./invite-teacher-form";

export default async function TeachersPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile:profiles(full_name, email)")
    .eq("school_id", schoolId);

  const rows = (teachers ?? []).map((t) => {
    const p = (t.profile as unknown as { full_name: string; email: string } | null);
    return {
      id: t.id,
      name: p?.full_name ?? "",
      email: p?.email ?? "",
    };
  });

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Manage your school's teaching staff."
        action={
          <ActionDialog trigger="+ Invite Teacher" title="Invite Teacher">
            {(onSuccess) => (
              <InviteTeacherForm schoolId={schoolId} onSuccess={onSuccess} />
            )}
          </ActionDialog>
        }
        stats={[{ label: "Total Teachers", value: rows.length }]}
      />

      <FilterableDataTable
        data={rows}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: "email" },
        ]}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search by name or email…"
        renderActions={(row) => (
          <Link
            href={`/admin/teachers/${row.id}`}
            className="text-sm text-primary hover:underline"
          >
            View Profile
          </Link>
        )}
        emptyState={
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Invite your first teacher to get started."
            action={
              <ActionDialog trigger="+ Invite Teacher" title="Invite Teacher">
                {(onSuccess) => (
                  <InviteTeacherForm schoolId={schoolId} onSuccess={onSuccess} />
                )}
              </ActionDialog>
            }
          />
        }
      />
    </div>
  );
}
