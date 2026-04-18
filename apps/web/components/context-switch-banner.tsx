import { headers } from "next/headers";
import { ExitContextButton } from "./exit-context-button";

export async function ContextSwitchBanner() {
  const headersList = await headers();
  const actingAs = headersList.get("x-acting-as");
  const realRole = headersList.get("x-real-role");

  if (!actingAs) return null;

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
      <span>
        You are viewing as <strong>{roleLabels[actingAs] ?? actingAs}</strong>.
        Actions are logged under your real identity ({realRole}).
      </span>
      <ExitContextButton />
    </div>
  );
}
