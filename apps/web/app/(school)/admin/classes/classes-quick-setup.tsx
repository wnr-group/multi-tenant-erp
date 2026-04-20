"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const PRESET_CLASSES = [
  "LKG", "UKG",
  "1", "2", "3", "4", "5",
  "6", "7", "8", "9", "10",
  "11", "12",
];

const PRESET_SECTIONS = ["A", "B", "C", "D", "E"];

export function ClassesQuickSetup({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [customClassInput, setCustomClassInput] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(["A", "B"]));
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [customSectionInput, setCustomSectionInput] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleClass(name: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleSection(name: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addCustomClass() {
    const name = customClassInput.trim();
    if (!name || customClasses.includes(name) || selectedClasses.has(name)) return;
    setCustomClasses((prev) => [...prev, name]);
    setSelectedClasses((prev) => new Set([...prev, name]));
    setCustomClassInput("");
  }

  function removeCustomClass(name: string) {
    setCustomClasses((prev) => prev.filter((c) => c !== name));
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  function addCustomSection() {
    const name = customSectionInput.trim();
    if (!name || customSections.includes(name) || selectedSections.has(name)) return;
    setCustomSections((prev) => [...prev, name]);
    setSelectedSections((prev) => new Set([...prev, name]));
    setCustomSectionInput("");
  }

  function removeCustomSection(name: string) {
    setCustomSections((prev) => prev.filter((s) => s !== name));
    setSelectedSections((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  const allClasses = [...PRESET_CLASSES.filter((c) => selectedClasses.has(c)), ...customClasses.filter((c) => selectedClasses.has(c))];
  const allSections = [...PRESET_SECTIONS.filter((s) => selectedSections.has(s)), ...customSections.filter((s) => selectedSections.has(s))];
  const totalCombinations = allClasses.length * allSections.length;

  async function handleCreate() {
    if (allClasses.length === 0) {
      toast.error("Select at least one class.");
      return;
    }
    if (allSections.length === 0) {
      toast.error("Select at least one section.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Create classes with order
    const classRows = allClasses.map((name, i) => ({
      school_id: schoolId,
      name,
      order: i + 1,
    }));

    const { data: createdClasses, error: classError } = await supabase
      .from("classes")
      .insert(classRows)
      .select("id, name");

    if (classError) {
      toast.error(classError.message);
      setLoading(false);
      return;
    }

    // Create sections for each class
    const sectionRows = (createdClasses ?? []).flatMap((cls) =>
      allSections.map((sectionName) => ({
        school_id: schoolId,
        class_id: cls.id,
        name: sectionName,
      }))
    );

    if (sectionRows.length > 0) {
      const { error: sectionError } = await supabase
        .from("sections")
        .insert(sectionRows);

      if (sectionError) {
        toast.error("Classes created but sections failed: " + sectionError.message);
        setLoading(false);
        router.refresh();
        return;
      }
    }

    setLoading(false);
    toast.success(`Created ${allClasses.length} classes × ${allSections.length} sections = ${totalCombinations} total.`);
    setSelectedClasses(new Set());
    setCustomClasses([]);
    setSelectedSections(new Set(["A", "B"]));
    setCustomSections([]);
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-lg border bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Quick Setup</h2>
        <p className="mt-1 text-sm text-gray-500">Select classes and sections to create them all at once.</p>
      </div>

      {/* Classes */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Classes</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_CLASSES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleClass(name)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedClasses.has(name)
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {name}
            </button>
          ))}
          {customClasses.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeCustomClass(name)}
              className="flex items-center gap-1 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              {name} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={customClassInput}
            onChange={(e) => setCustomClassInput(e.target.value)}
            placeholder="Custom class name..."
            className="max-w-48"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomClass(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomClass}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Sections per class</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SECTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleSection(name)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSections.has(name)
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {name}
            </button>
          ))}
          {customSections.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeCustomSection(name)}
              className="flex items-center gap-1 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              {name} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={customSectionInput}
            onChange={(e) => setCustomSectionInput(e.target.value)}
            placeholder="Custom section name..."
            className="max-w-48"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSection(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomSection}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Preview + Create */}
      <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-600">
          {allClasses.length > 0 && allSections.length > 0 ? (
            <>
              <span className="font-semibold text-gray-900">{allClasses.length}</span> classes ×{" "}
              <span className="font-semibold text-gray-900">{allSections.length}</span> sections ={" "}
              <span className="font-semibold text-gray-900">{totalCombinations}</span> total
            </>
          ) : (
            "Select classes and sections above"
          )}
        </p>
        <Button onClick={handleCreate} disabled={loading || allClasses.length === 0 || allSections.length === 0}>
          {loading ? "Creating…" : "Create All"}
        </Button>
      </div>
    </div>
  );
}
