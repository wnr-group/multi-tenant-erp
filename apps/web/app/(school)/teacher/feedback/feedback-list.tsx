"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FeedbackStatus = "pending" | "responded";

interface StudentSnippet {
  id: string;
  full_name: string | null;
  class_name: string | null;
  section_name: string | null;
  roll_number: string | null;
  photo_url: string | null;
}

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  from_name: string;
  from_role: string;
  status: string;
  response: string;
  created_at: string;
  student?: StudentSnippet;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "responded") return "default";
  return "secondary";
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const [filter, setFilter] = useState<"all" | "parents">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.status]))
  );
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of items) map[item.id] = item.response ?? "";
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const filtered = filter === "parents" ? items.filter(i => i.from_role === "parent") : items;

  async function handleRespond(id: string) {
    setSaving(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    const supabase = createClient();
    const { error } = await supabase
      .from("feedback")
      .update({ response: responses[id], status: "responded" as FeedbackStatus })
      .eq("id", id);
    setSaving(null);
    if (error) {
      setErrors((prev) => ({ ...prev, [id]: error.message }));
      return;
    }
    setStatuses((prev) => ({ ...prev, [id]: "responded" }));
    setOpenId(null);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-gray-400">No feedback received yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["all", "parents"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "All" : "From Parents"}
          </button>
        ))}
      </div>
      <div className="grid gap-4">
      {filtered.map((item) => (
        <div key={item.id} className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{item.subject}</h3>
                <Badge variant={statusVariant(statuses[item.id] ?? item.status)}>
                  {(statuses[item.id] ?? item.status) === "responded" ? "Responded" : "Pending"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{item.message}</p>
              <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                From:&nbsp;
                {item.student ? (
                  <span className="relative inline-block group">
                    <span className="cursor-default underline decoration-dotted decoration-gray-400">
                      {item.from_name}
                    </span>
                    <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <span className="flex items-center gap-2 mb-2">
                        {item.student.photo_url ? (
                          <img src={item.student.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {(item.student.full_name ?? "?")[0].toUpperCase()}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900 text-xs">{item.student.full_name ?? "—"}</span>
                      </span>
                      <span className="block text-xs text-gray-500 mb-0.5">
                        {[item.student.class_name, item.student.section_name ? `Sec ${item.student.section_name}` : null].filter(Boolean).join(" · ")}
                      </span>
                      {item.student.roll_number && (
                        <span className="block text-xs text-gray-500 mb-2">Roll: {item.student.roll_number}</span>
                      )}
                      <Link
                        href={`/admin/students/${item.student.id}`}
                        className="pointer-events-auto text-xs font-medium text-indigo-600 hover:underline"
                      >
                        View Profile →
                      </Link>
                    </span>
                  </span>
                ) : (
                  item.from_name
                )}
                &nbsp;·&nbsp; {item.created_at}
              </p>
              {responses[item.id] && (statuses[item.id] ?? item.status) === "responded" && (
                <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <span className="font-medium">Your response: </span>
                  {responses[item.id]}
                </div>
              )}
            </div>
            {(statuses[item.id] ?? item.status) !== "responded" && (
              <Button
                type="button"
                onClick={() =>
                  setOpenId(openId === item.id ? null : item.id)
                }
              >
                Respond
              </Button>
            )}
          </div>

          {openId === item.id && (
            <div className="mt-4">
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                rows={3}
                value={responses[item.id] ?? ""}
                onChange={(e) =>
                  setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                placeholder="Write your response…"
              />
              {errors[item.id] && (
                <p className="mt-1 text-xs text-red-600">{errors[item.id]}</p>
              )}
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleRespond(item.id)}
                  disabled={saving === item.id || !responses[item.id]}
                >
                  {saving === item.id ? "Sending…" : "Send Response"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpenId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
