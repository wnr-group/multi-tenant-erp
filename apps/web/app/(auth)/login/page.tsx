import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServiceSupabaseClient } from "../../../lib/supabase/server";
import { LoginForm } from "./login-form";

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
    .select("name, primary_color")
    .eq("domain", domain)
    .single();

  const schoolName = school?.name ?? "School Portal";
  const primaryColor = school?.primary_color ?? "#2563EB";

  return <LoginForm schoolName={schoolName} primaryColor={primaryColor} />;
}
