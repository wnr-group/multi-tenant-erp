import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getActiveSection } from "@/lib/section-context";
import { DataTable } from "@/components/data-table";
import { CreateHomeworkForm } from "./create-homework-form";
import { NoSectionPrompt } from "../no-section-prompt";

export default async function HomeworkPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = (await getSchoolId())!;

  const [{ data: homework }, { data: classes }, { data: activeSection }] = await Promise.all([
    supabase
      .from("homework")
      .select(
        "id, title, description, due_date, subject:subjects(name), section:sections(name, class:classes(name))"
      )
      .eq("section_id", sectionId)
      .order("due_date", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("sections")
      .select("class_id")
      .eq("id", sectionId)
      .single(),
  ]);

  const rows = (homework ?? []).map((h) => {
    const subject = h.subject as unknown as { name: string } | null;
    const section = h.section as unknown as {
      name: string;
      class: { name: string } | null;
    } | null;
    return {
      id: h.id,
      title: h.title ?? "—",
      subject: subject?.name ?? "—",
      section: section ? `${section.class?.name ?? ""} – ${section.name}` : "—",
      due_date: h.due_date ? new Date(h.due_date).toLocaleDateString() : "—",
      description: h.description ?? "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Homework</h1>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Assign New Homework
        </h2>
        <CreateHomeworkForm
          teacherId={user!.id}
          schoolId={schoolId}
          classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
          activeSectionId={sectionId}
          activeSectionClassId={activeSection?.class_id ?? undefined}
        />
      </div>

      <DataTable
        data={rows}
        columns={[
          { header: "Title", accessor: "title" },
          { header: "Subject", accessor: "subject" },
          { header: "Section", accessor: "section" },
          { header: "Due Date", accessor: "due_date" },
          { header: "Description", accessor: "description" },
        ]}
        emptyMessage="No homework assigned yet."
      />
    </div>
  );
}
