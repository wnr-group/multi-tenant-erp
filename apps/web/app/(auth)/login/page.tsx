import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServiceSupabaseClient } from "../../../lib/supabase/server";
import { LoginForm } from "./login-form";
import { FindSchoolForm } from "./find-school-form";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");

  // Use service role to bypass RLS — login page is unauthenticated
  const supabase = createServiceSupabaseClient();
  const { data: school } = await supabase
    .from("schools")
    .select("id, name, primary_color")
    .eq("domain", domain)
    .single();

  // On the apex/marketing domain no school resolves (unknown subdomains are
  // rewritten to /school-not-found by middleware before reaching here), so the
  // visitor is on the bare domain. Help them find their school's subdomain.
  if (!school) {
    return <FindSchoolForm host={host} />;
  }

  return (
    <LoginForm
      schoolId={school.id}
      schoolName={school.name}
      primaryColor={school.primary_color ?? "#2563EB"}
    />
  );
}
