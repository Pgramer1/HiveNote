"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteResource } from "@/actions/resources";
import { useRouter } from "next/navigation";

export default function DeleteResourceButton({ resourceId }: { resourceId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteResource(resourceId);
      setConfirming(false);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Confirm
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete resource"
      className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
