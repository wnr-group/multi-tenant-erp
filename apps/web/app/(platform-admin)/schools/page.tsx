import Link from "next/link";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

export default async function SchoolsPage() {
  const supabase = createServiceSupabaseClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, contact_email, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <Link
          href="/platform-admin/schools/new"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
        >
          + New School
        </Link>
      </div>
      <DataTable
        data={schools ?? []}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Email", accessor: "contact_email" },
          {
            header: "Status",
            accessor: (row) => (
              <Badge variant={row.is_active ? "default" : "secondary"}>
                {row.is_active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "",
            accessor: (row) => (
              <Link
                href={`/platform-admin/schools/${row.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View
              </Link>
            ),
          },
        ]}
        emptyMessage="No schools yet. Create one to get started."
      />
    </div>
  );
}
