import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export function Sidebar({ username }: { username: string }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-72 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              Transcript Studio
            </p>
            <p className="text-muted-foreground truncate text-xs">{username}</p>
          </div>
        </div>
        <SignOutButton />
      </div>

      <div className="px-3 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          disabled
        >
          <Plus className="size-4" />
          New transcript
        </Button>
      </div>

      <div className="mt-2 px-4 py-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Transcripts
        </h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground text-sm">No transcripts yet</p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          Record or import one to get started.
        </p>
      </div>
    </aside>
  );
}
