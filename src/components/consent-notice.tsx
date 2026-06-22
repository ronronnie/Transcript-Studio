"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONSENT_COOKIE = "ts_consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${CONSENT_COOKIE}=`));
}

/**
 * One-time consent notice. Shown until acknowledged, then remembered for a year
 * via a cookie. Reminds the user they're responsible for having consent to
 * record/transcribe conversations.
 */
export function ConsentNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasConsent()) setOpen(true);
  }, []);

  function acknowledge() {
    document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-primary text-primary-foreground mb-1 flex size-10 items-center justify-center rounded-lg">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle>Before you record</DialogTitle>
          <DialogDescription>
            You&apos;re responsible for having consent to record or transcribe
            any conversation. Laws vary by location — make sure everyone
            involved has agreed before capturing audio.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={acknowledge} className="w-full">
          I understand
        </Button>
      </DialogContent>
    </Dialog>
  );
}
