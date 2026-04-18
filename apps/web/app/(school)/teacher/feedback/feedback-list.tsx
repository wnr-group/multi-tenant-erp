"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FeedbackStatus = "pending" | "responded";

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  from_name: string;
  status: string;
  response: string;
  created_at: string;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "responded") return "default";
  return "secondary";
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of items) map[item.id] = item.response ?? "";
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{item.subject}</h3>
                <Badge variant={statusVariant(item.status)}>
                  {item.status === "responded" ? "Responded" : "Pending"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{item.message}</p>
              <p className="mt-2 text-xs text-gray-400">
                From: {item.from_name} &nbsp;·&nbsp; {item.created_at}
              </p>
              {item.response && item.status === "responded" && (
                <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <span className="font-medium">Your response: </span>
                  {item.response}
                </div>
              )}
            </div>
            {item.status !== "responded" && (
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
  );
}
