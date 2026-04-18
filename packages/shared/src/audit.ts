import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    schoolId?: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    actingAsRole?: string;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  await supabase.from("audit_log").insert({
    school_id: params.schoolId ?? null,
    performed_by: user.id,
    acting_as_role: params.actingAsRole ?? roleRow?.role ?? "unknown",
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
