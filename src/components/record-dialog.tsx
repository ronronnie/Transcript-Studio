"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TranscriptDTO } from "@/lib/transcript-types";

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (transcript: TranscriptDTO) => void;
}

type Phase =
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "saving"
  | "error";

// Minimum length we'll accept, to reject accidental empty recordings.
const MIN_DURATION_S = 1;

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported?.(type)
    ) {
      return type;
    }
  }
  return "";
}

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordDialog({
  open,
  onOpenChange,
  onCreated,
}: RecordDialogProps) {
  const [phase, setPhase] = useState<Phase>("requesting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef<string>("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Timer bookkeeping (handles pause/resume).
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // already stopped
      }
    }
    recorderRef.current = null;
  }, []);

  // Live level meter (a simple waveform) drawn from an AnalyserNode.
  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        rafRef.current = requestAnimationFrame(draw);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const c = canvas.getContext("2d");
        if (!c) return;
        analyser.getByteFrequencyData(data);

        const { width, height } = canvas;
        c.clearRect(0, 0, width, height);
        const bars = data.length;
        const gap = 2;
        const barWidth = (width - gap * (bars - 1)) / bars;
        const accent =
          getComputedStyle(canvas).getPropertyValue("color") || "#000";
        c.fillStyle = accent;
        const paused = recorderRef.current?.state === "paused";
        for (let i = 0; i < bars; i++) {
          const v = paused ? 2 : (data[i] / 255) * height;
          const h = Math.max(2, v);
          c.fillRect(i * (barWidth + gap), (height - h) / 2, barWidth, h);
        }
      };
      draw();
    } catch {
      // Meter is decorative; ignore failures.
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPhase("requesting");
    setElapsed(0);
    chunksRef.current = [];
    blobRef.current = null;
    pausedTotalRef.current = 0;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Recording isn't supported in this browser.");
      setPhase("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Microphone access was denied. Allow mic access in your browser and try again."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone was found. Please connect one and try again.");
      } else {
        setError("Could not access the microphone. Please try again.");
      }
      setPhase("error");
      return;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    mimeRef.current = mime;
    const recorder = new MediaRecorder(
      stream,
      mime ? { mimeType: mime } : undefined
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = mimeRef.current || "audio/webm";
      blobRef.current = new Blob(chunksRef.current, { type });
      if (timerRef.current) clearInterval(timerRef.current);
      const duration =
        (performance.now() - startedAtRef.current - pausedTotalRef.current) /
        1000;
      setElapsed(duration);
      if (duration < MIN_DURATION_S || blobRef.current.size === 0) {
        setError("That recording was too short. Please record a bit longer.");
        setPhase("error");
        return;
      }
      setPhase("stopped");
    };

    recorder.start();
    startedAtRef.current = performance.now();
    startMeter(stream);
    timerRef.current = setInterval(() => {
      setElapsed(
        (performance.now() - startedAtRef.current - pausedTotalRef.current) /
          1000
      );
    }, 200);
    setPhase("recording");
  }, [startMeter]);

  // Start recording when the dialog opens; tear everything down when it closes.
  // Kicking off capture (and its setState) on open is the intended behavior.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      start();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pause() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.pause();
      pausedAtRef.current = performance.now();
      setPhase("paused");
    }
  }

  function resume() {
    const recorder = recorderRef.current;
    if (recorder?.state === "paused") {
      recorder.resume();
      pausedTotalRef.current += performance.now() - pausedAtRef.current;
      setPhase("recording");
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  function close(next: boolean) {
    if (!next) {
      cleanup();
      setPhase("requesting");
      setError(null);
      setElapsed(0);
      setTitle("");
    }
    onOpenChange(next);
  }

  async function save() {
    const blob = blobRef.current;
    if (!blob) return;
    setPhase("saving");
    setError(null);
    try {
      const ext = extensionForMime(mimeRef.current || blob.type);
      const body = new FormData();
      body.append("file", blob, `recording.${ext}`);
      body.append("source", "recording");
      if (title.trim()) body.append("title", title.trim());

      const res = await fetch("/api/transcripts/upload", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not save the recording.");
        setPhase("stopped");
        return;
      }
      onCreated(data.transcript as TranscriptDTO);
      close(false);
    } catch {
      setError("Could not save the recording. Please try again.");
      setPhase("stopped");
    }
  }

  const isActive = phase === "recording" || phase === "paused";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record audio</DialogTitle>
          <DialogDescription>
            Record from your microphone, then transcribe it.
          </DialogDescription>
        </DialogHeader>

        {phase === "requesting" && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Waiting for microphone permission…
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col gap-4 py-4">
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={start}>Try again</Button>
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="flex items-center gap-2">
              <span
                className={
                  phase === "recording"
                    ? "bg-destructive size-2.5 animate-pulse rounded-full"
                    : "bg-muted-foreground size-2.5 rounded-full"
                }
              />
              <span className="text-muted-foreground text-sm">
                {phase === "recording" ? "Recording" : "Paused"}
              </span>
            </div>

            <div className="font-mono text-4xl tabular-nums">
              {formatTime(elapsed)}
            </div>

            <canvas
              ref={canvasRef}
              width={320}
              height={48}
              className="text-primary h-12 w-full max-w-xs"
            />

            <div className="flex items-center gap-2">
              {phase === "recording" ? (
                <Button variant="outline" onClick={pause}>
                  <Pause className="size-4" />
                  Pause
                </Button>
              ) : (
                <Button variant="outline" onClick={resume}>
                  <Play className="size-4" />
                  Resume
                </Button>
              )}
              <Button onClick={stop}>
                <Square className="size-4" />
                Stop
              </Button>
            </div>
          </div>
        )}

        {(phase === "stopped" || phase === "saving") && (
          <div className="flex flex-col gap-4 py-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Mic className="size-4" />
              Recorded {formatTime(elapsed)}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recording-title">Title (optional)</Label>
              <Input
                id="recording-title"
                placeholder="e.g. Voice note"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => close(false)}
                disabled={phase === "saving"}
              >
                Discard
              </Button>
              <Button onClick={save} disabled={phase === "saving"}>
                {phase === "saving" && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {phase === "saving" ? "Saving…" : "Transcribe"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
