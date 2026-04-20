"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const PRESET_SUBJECTS = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Environmental Studies",
  "Computer Science",
  "Physical Education",
  "Art & Craft",
  "Music",
  "Moral Science",
  "General Knowledge",
];

interface ClassOption {
  id: string;
  name: string;
}

export function SubjectsQuickSetup({
  schoolId,
  classes,
}: {
  schoolId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggleSubject(name: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllClasses() {
    setSelectedClasses(new Set(classes.map((c) => c.id)));
  }

  function clearAllClasses() {
    setSelectedClasses(new Set());
  }

  function addCustomSubject() {
    const name = customInput.trim();
    if (!name || customSubjects.includes(name) || PRESET_SUBJECTS.includes(name)) return;
    setCustomSubjects((prev) => [...prev, name]);
    setSelectedSubjects((prev) => new Set([...prev, name]));
    setCustomInput("");
  }

  function removeCustomSubject(name: string) {
    setCustomSubjects((prev) => prev.filter((s) => s !== name));
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  const allSubjects = [
    ...PRESET_SUBJECTS.filter((s) => selectedSubjects.has(s)),
    ...customSubjects.filter((s) => selectedSubjects.has(s)),
  ];
  const allClassIds = classes.filter((c) => selectedClasses.has(c.id));
  const totalCombinations = allSubjects.length * allClassIds.length;

  async function handleCreate() {
    if (allSubjects.length === 0) {
      toast.error("Select at least one subject.");
      return;
    }
    if (allClassIds.length === 0) {
      toast.error("Select at least one class.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Generate code from subject name (first 3 letters uppercase)
    function makeCode(name: string) {
      return name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
    }

    const rows = allSubjects.flatMap((subjectName) =>
      allClassIds.map((cls) => ({
        school_id: schoolId,
        class_id: cls.id,
        name: subjectName,
        code: makeCode(subjectName),
      }))
    );

    const { error } = await supabase.from("subjects").insert(rows);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      `Created ${allSubjects.length} subjects × ${allClassIds.length} classes = ${totalCombinations} entries.`
    );
    setSelectedSubjects(new Set());
    setCustomSubjects([]);
    setSelectedClasses(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-lg border bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Quick Setup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select subjects and classes to assign them all at once.
        </p>
      </div>

      {/* Subjects */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Subjects</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SUBJECTS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleSubject(name)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSubjects.has(name)
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {name}
            </button>
          ))}
          {customSubjects.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeCustomSubject(name)}
              className="flex items-center gap-1 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              {name} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Custom subject name..."
            className="max-w-56"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSubject();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomSubject}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Classes */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Assign to classes</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllClasses}
              className="text-xs text-indigo-600 hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAllClasses}
              className="text-xs text-gray-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        {classes.length === 0 ? (
          <p className="text-sm text-gray-400">
            No classes created yet. Go to Classes page first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggleClass(cls.id)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedClasses.has(cls.id)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview + Create */}
      <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-600">
          {allSubjects.length > 0 && allClassIds.length > 0 ? (
            <>
              <span className="font-semibold text-gray-900">{allSubjects.length}</span>{" "}
              subjects ×{" "}
              <span className="font-semibold text-gray-900">{allClassIds.length}</span>{" "}
              classes ={" "}
              <span className="font-semibold text-gray-900">{totalCombinations}</span>{" "}
              entries
            </>
          ) : (
            "Select subjects and classes above"
          )}
        </p>
        <Button
          onClick={handleCreate}
          disabled={loading || allSubjects.length === 0 || allClassIds.length === 0}
        >
          {loading ? "Creating…" : "Create All"}
        </Button>
      </div>
    </div>
  );
}
