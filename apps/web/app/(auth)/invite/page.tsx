"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { GraduationCap, CheckCircle2 } from "lucide-react";

export default function InviteAcceptPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    function setUserFromSession(session: { user: { user_metadata: Record<string, string> } } | null) {
      if (!session) return;
      setTokenVerified(true);
      setUserName(session.user.user_metadata?.full_name ?? "");
      setUserRole(session.user.user_metadata?.invited_role ?? "");
      setSchoolName(session.user.user_metadata?.school_name ?? "");
    }

    // Listen for auth state changes (fires when token from URL hash is exchanged)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setUserFromSession(session);
      }
    });

    // Check if already has a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserFromSession(session);
    });

    // Explicitly try to exchange the hash params if present
    // createBrowserClient from @supabase/ssr may not auto-detect URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // Parse the hash into params and call setSession or getUser
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data: { session } }) => {
            setUserFromSession(session);
          });
      }
    }

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/login");
    }, 2000);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-semibold text-foreground">You're all set!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting you to sign in...
          </p>
        </div>
      </main>
    );
  }

  if (!tokenVerified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-muted-foreground">Verifying your invite link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              {userName ? `Welcome, ${userName}!` : "Welcome!"}
            </h1>
            {(schoolName || userRole) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {userRole && <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{userRole}</span>}
                {schoolName && <span className="ml-1.5">at {schoolName}</span>}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Create a password to access your account.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Minimum 8 characters"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter your password"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Setting up your account..." : "Set Password & Get Started"}
        </button>
      </form>
    </main>
  );
}
