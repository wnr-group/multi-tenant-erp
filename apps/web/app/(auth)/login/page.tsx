import { headers } from "next/headers";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");

  const supabase = await createServerSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name, primary_color")
    .eq("domain", domain)
    .single();

  const schoolName = school?.name ?? "School Portal";
  const primaryColor = school?.primary_color ?? "#2563EB";

  return <LoginForm schoolName={schoolName} primaryColor={primaryColor} />;
}
