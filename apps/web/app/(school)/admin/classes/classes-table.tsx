"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { School, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ClassRow {
  id: string;
  name: string;
  order: number;
}

interface SectionRow {
  id: string;
  class_name: string;
  section_name: string;
}

// ─── Classes Table ───

export function ClassesDataTable({
  classes,
  schoolId,
}: {
  classes: ClassRow[];
  schoolId: string;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState<string | null>(null);
  const [editClass, setEditClass] = useState<ClassRow | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  async function moveClass(classId: string, direction: "up" | "down") {
    const sorted = [...classes].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === classId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setMoving(classId);
    const supabase = createClient();
    const current = sorted[idx];
    const swap = sorted[swapIdx];

    await Promise.all([
      supabase.from("classes").update({ order: swap.order }).eq("id", current.id),
      supabase.from("classes").update({ order: current.order }).eq("id", swap.id),
    ]);

    setMoving(null);
    router.refresh();
  }

  function openEdit(row: ClassRow) {
    setEditClass(row);
    setEditName(row.name);
  }

  async function handleEditSave() {
    if (!editClass || !editName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("classes")
      .update({ name: editName.trim() })
      .eq("id", editClass.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Class renamed.");
    setEditClass(null);
    router.refresh();
  }

  async function deleteClass(row: ClassRow) {
    if (!confirm(`Delete "${row.name}"? This will also delete all its sections.`)) return;
    const supabase = createClient();

    // Delete sections first (FK constraint)
    await supabase.from("sections").delete().eq("class_id", row.id);
    const { error } = await supabase.from("classes").delete().eq("id", row.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${row.name}" deleted.`);
    router.refresh();
  }

  return (
    <>
      <FilterableDataTable
        data={classes}
        columns={[
          {
            header: "#",
            accessor: (row) => (
              <span className="text-xs text-gray-400">{row.order}</span>
            ),
          },
          { header: "Class Name", accessor: "name" },
        ]}
        searchKeys={["name"]}
        searchPlaceholder="Search classes..."
        renderActions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => moveClass(row.id, "up")}
              disabled={moving === row.id}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              title="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => moveClass(row.id, "down")}
              disabled={moving === row.id}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              title="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openEdit(row)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => deleteClass(row)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={School}
            title="No classes yet"
            description="Use Quick Setup above to create classes."
          />
        }
      />

      {/* Edit class dialog */}
      <Dialog open={!!editClass} onOpenChange={(open) => { if (!open) setEditClass(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Class</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Class Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sections Table ───

export function SectionsDataTable({
  sectionRows,
  schoolId,
  classes,
}: {
  sectionRows: SectionRow[];
  schoolId: string;
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editSection, setEditSection] = useState<SectionRow | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(row: SectionRow) {
    setEditSection(row);
    setEditSectionName(row.section_name);
  }

  async function handleEditSave() {
    if (!editSection || !editSectionName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("sections")
      .update({ name: editSectionName.trim() })
      .eq("id", editSection.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Section renamed.");
    setEditSection(null);
    router.refresh();
  }

  async function deleteSection(row: SectionRow) {
    if (!confirm(`Delete section "${row.section_name}" from ${row.class_name}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("sections").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Section "${row.section_name}" deleted.`);
    router.refresh();
  }

  return (
    <>
      <FilterableDataTable
        data={sectionRows}
        columns={[
          { header: "Class", accessor: "class_name" },
          { header: "Section", accessor: "section_name" },
        ]}
        searchKeys={["class_name", "section_name"]}
        searchPlaceholder="Search sections..."
        renderActions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(row)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => deleteSection(row)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={School}
            title="No sections yet"
            description="Add sections after creating classes."
          />
        }
      />

      {/* Edit section dialog */}
      <Dialog open={!!editSection} onOpenChange={(open) => { if (!open) setEditSection(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Section — {editSection?.class_name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Section Name</Label>
              <Input
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
