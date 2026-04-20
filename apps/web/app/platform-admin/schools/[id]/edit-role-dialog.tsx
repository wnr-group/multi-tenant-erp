"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ROLES = [
  { value: "school_admin", label: "School Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
] as const;

type Role = (typeof ROLES)[number]["value"];

export interface EditRoleDialogProps {
  schoolId: string;
  roleId: string;
  userName: string;
  currentRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditRoleDialog({
  schoolId,
  roleId,
  userName,
  currentRole,
  open,
  onOpenChange,
  onSuccess,
}: EditRoleDialogProps) {
  const router = useRouter();
  const [role, setRole] = useState<string>(currentRole);
  const [loading, setLoading] = useState(false);

  // Sync role state when the target user changes
  useEffect(() => {
    setRole(currentRole);
  }, [currentRole, roleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/users/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { message?: string })?.message ?? "Failed to update role.");
        return;
      }

      toast.success(`Role updated for ${userName}.`);
      if (onSuccess) {
        onSuccess();
      } else {
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Role — {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
