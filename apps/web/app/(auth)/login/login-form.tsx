"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { loginSchema } from "@erp/shared";
import { GraduationCap } from "lucide-react";

export function LoginForm({
  schoolName,
  primaryColor,
}: {
  schoolName: string;
  primaryColor: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  // Handle session on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && reason === "no_access") {
        // Middleware sent us here because user has no role on this domain — sign out
        supabase.auth.signOut();
      } else if (session && !reason) {
        // User has a valid session — redirect them away from login
        window.location.href = "/";
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      // Sign out to clear any stale session that could trigger infinite refresh loops
      await supabase.auth.signOut();
      return;
    }

    // Hard navigation so middleware can redirect to the correct role-based dashboard
    window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">{schoolName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
