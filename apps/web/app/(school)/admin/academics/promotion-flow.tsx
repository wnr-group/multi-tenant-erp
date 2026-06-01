"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface StudentRow {
  studentProfileId: string;
  name: string;
  currentClass: string;
  currentSection: string;
  suggestedClassId: string;
  suggestedClassName: string;
  suggestedSectionId: string;
  suggestedSectionName: string;
  hasPendingResults: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

interface Props {
  students: StudentRow[];
  draftYearId: string;
  classes: ClassOption[];
  sections: SectionOption[];
}

export function PromotionFlow({ students, draftYearId, classes, sections }: Props) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, { classId: string; sectionId: string }>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "ready">("all");

  const filtered = students.filter((s) => {
    if (filter === "pending") return s.hasPendingResults;
    if (filter === "ready") return !s.hasPendingResults;
    return true;
  });

  function getEffective(s: StudentRow) {
    return overrides[s.studentProfileId] ?? {
      classId: s.suggestedClassId,
      sectionId: s.suggestedSectionId,
    };
  }

  async function handlePromote() {
    const toPromote = students.filter((s) => !excluded.has(s.studentProfileId));
    const promotions = toPromote.map((s) => {
      const eff = getEffective(s);
      return { studentProfileId: s.studentProfileId, targetClassId: eff.classId, targetSectionId: eff.sectionId };
    });
    setLoading(true);
    const res = await fetch("/api/academics/promote-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftYearId, promotions }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Promotion failed"); return; }
    const data = await res.json();
    toast.success(`${data.promoted} students promoted to draft year.`);
    router.push("/admin/academics");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "ready", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${filter === f ? "bg-indigo-600 text-white" : "bg-muted text-foreground"}`}
          >
            {f === "all" ? `All (${students.length})` : f === "ready" ? `Ready (${students.filter((s) => !s.hasPendingResults).length})` : `Pending results (${students.filter((s) => s.hasPendingResults).length})`}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {students.length - excluded.size} of {students.length} will be promoted
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Promote</th>
              <th className="px-4 py-2 text-left">Student</th>
              <th className="px-4 py-2 text-left">Current</th>
              <th className="px-4 py-2 text-left">Target Class</th>
              <th className="px-4 py-2 text-left">Target Section</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => {
              const eff = getEffective(s);
              const filteredSections = sections.filter((sec) => sec.classId === eff.classId);
              return (
                <tr key={s.studentProfileId} className={excluded.has(s.studentProfileId) ? "opacity-40" : ""}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={!excluded.has(s.studentProfileId)}
                      onChange={() => setExcluded((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.studentProfileId)) next.delete(s.studentProfileId); else next.add(s.studentProfileId);
                        return next;
                      })}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.currentClass} {s.currentSection}</td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={eff.classId}
                      onChange={(e) => setOverrides((prev) => ({
                        ...prev,
                        [s.studentProfileId]: { classId: e.target.value, sectionId: sections.find((sec) => sec.classId === e.target.value)?.id ?? "" },
                      }))}
                    >
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={eff.sectionId}
                      onChange={(e) => setOverrides((prev) => ({
                        ...prev,
                        [s.studentProfileId]: { ...getEffective(s), sectionId: e.target.value },
                      }))}
                    >
                      {filteredSections.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {s.hasPendingResults ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending results</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ready</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/academics")}>Cancel</Button>
        <Button onClick={handlePromote} disabled={loading || excluded.size === students.length}>
          {loading ? "Promoting…" : `Promote ${students.length - excluded.size} Students`}
        </Button>
      </div>
    </div>
  );
}
