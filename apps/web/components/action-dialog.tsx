"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActionDialogProps {
  trigger: string;
  title: string;
  children: (onSuccess: () => void) => React.ReactNode;
}

export function ActionDialog({ trigger, title, children }: ActionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">{children(() => setOpen(false))}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
