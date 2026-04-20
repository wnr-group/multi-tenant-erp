"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { School, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";
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

export function ClassesDataTable({
  classes,
  schoolId,
}: {
  classes: ClassRow[];
  schoolId: string;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState<string | null>(null);

  async function moveClass(classId: string, direction: "up" | "down") {
    const sorted = [...classes].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === classId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setMoving(classId);
    const supabase = createClient();

    // Swap order values
    const current = sorted[idx];
    const swap = sorted[swapIdx];

    await Promise.all([
      supabase.from("classes").update({ order: swap.order }).eq("id", current.id),
      supabase.from("classes").update({ order: current.order }).eq("id", swap.id),
    ]);

    setMoving(null);
    router.refresh();
  }

  return (
    <FilterableDataTable
      data={classes}
      columns={[
        {
          header: "Order",
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
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => moveClass(row.id, "down")}
            disabled={moving === row.id}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
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
  );
}

export function SectionsDataTable({
  sectionRows,
}: {
  sectionRows: SectionRow[];
}) {
  return (
    <FilterableDataTable
      data={sectionRows}
      columns={[
        { header: "Class", accessor: "class_name" },
        { header: "Section", accessor: "section_name" },
      ]}
      searchKeys={["class_name", "section_name"]}
      searchPlaceholder="Search sections..."
      emptyState={
        <EmptyState
          icon={School}
          title="No sections yet"
          description="Add sections after creating classes."
        />
      }
    />
  );
}
