import { cookies, headers } from "next/headers";
import { ExitContextButton } from "./exit-context-button";

export async function ContextSwitchBanner() {
  const cookieStore = await cookies();
  const actingAs = cookieStore.get("acting_as")?.value;

  if (!actingAs) return null;

  const headersList = await headers();
  const realRole = headersList.get("x-real-role") ?? "school_admin";

  const roleLabels: Record<string, string> = {
    school_admin: "School Admin",
    principal: "Principal",
    teacher: "Teacher",
  };

  return (
    <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-5 py-2 text-sm text-amber-800">
      <span>
        Viewing as <strong className="font-semibold">{roleLabels[actingAs] ?? actingAs}</strong>
        <span className="mx-2 text-amber-400">&middot;</span>
        Actions logged under your real identity
      </span>
      <ExitContextButton realRole={realRole} />
    </div>
  );
}
