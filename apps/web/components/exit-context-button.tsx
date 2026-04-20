"use client";

export function ExitContextButton({ realRole }: { realRole?: string }) {
  async function exit() {
    await fetch("/api/context-exit", { method: "POST" });
    const host = window.location.hostname;
    const parentDomain = host.includes("lvh.me") ? ".lvh.me" : host.includes("balajierp.com") ? ".balajierp.com" : "";
    document.cookie = `acting_as=; path=/; domain=${parentDomain}; max-age=0`;

    if (realRole === "super_admin") {
      // Super admin exits back to platform admin domain
      const port = window.location.port ? `:${window.location.port}` : "";
      const adminUrl = host.includes("lvh.me")
        ? `http://core.lvh.me${port}/platform-admin/dashboard`
        : `https://admin.balajierp.com/platform-admin/dashboard`;
      window.location.href = adminUrl;
    } else {
      // School admin exits back to their own dashboard on the same domain
      window.location.href = "/admin/dashboard";
    }
  }

  return (
    <button
      onClick={exit}
      className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
    >
      Exit View
    </button>
  );
}
