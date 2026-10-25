"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { loadFaceEngine, readFace, type FaceApi, type FaceReading } from "@/lib/faceEngine";
import { isChallengeMet, pickChallenge, type LivenessChallenge, type PoseSample } from "@/lib/liveness";

export type ScanMode = "enroll" | "verify";

type Phase =
  | "starting"
  | "loading"
  | "align"
  | "challenge"
  | "capture"
  | "matching"
  | "success"
  | "failed";

interface FaceScannerProps {
  readonly mode: ScanMode;
  /** Receives the captured face samples; reject to show the error and allow a retry. */
  readonly onCapture: (samples: number[][]) => Promise<void>;
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
}

/** Short gap between frames: a blink only lasts a fraction of a second. */
const POLL_MS = 20;
const ALIGN_FRAMES = 5;
const MIN_FACE_SIZE = 0.2;
const FRONTAL_TOLERANCE = 0.1;
const MIN_EAR_FOR_CAPTURE = 0.2;
const ALIGN_TIMEOUT_MS = 20_000;
const CHALLENGE_TIMEOUT_MS = 15_000;
const CAPTURE_TIMEOUT_MS = 15_000;
const CAPTURE_GAP_MS = 220;
const SUCCESS_HOLD_MS = 1200;
const SAMPLES_BY_MODE: Record<ScanMode, number> = { enroll: 5, verify: 3 };

class ScanError extends Error {}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isFrontal = (pose: PoseSample) => Math.abs(pose.yaw - 0.5) <= FRONTAL_TOLERANCE;

function describeScanError(error: unknown): string {
  if (error instanceof ScanError || error instanceof ApiError) return error.message;
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera access is blocked. Allow the camera in your browser's address bar, then try again.";
    }
    if (error.name === "NotFoundError") return "No camera was found on this device.";
    if (error.name === "NotReadableError") return "The camera is busy in another app.";
  }
  return "The face scan could not start. Please try again.";
}

const CHALLENGE_TEXT: Record<LivenessChallenge, string> = {
  blink: "Blink once, naturally",
  turn: "Slowly turn your head to one side",
};

function titleFor(phase: Phase, mode: ScanMode, challenge: LivenessChallenge | null): string {
  switch (phase) {
    case "starting":
      return "Allow camera access";
    case "loading":
      return "Getting ready…";
    case "align":
      return "Look at the camera";
    case "challenge":
      return challenge ? CHALLENGE_TEXT[challenge] : "Almost there";
    case "capture":
      return "Hold still…";
    case "matching":
      return mode === "enroll" ? "Saving your face…" : "Matching your face…";
    case "success":
      return mode === "enroll" ? "Face registered" : "Face matched. Welcome back!";
    case "failed":
      return "Scan failed";
  }
}

const HINTS: Record<Phase, string> = {
  starting: "Your browser will ask for permission. The video stays on this device.",
  loading: "Loading the face scanner.",
  align: "Centre your face in the circle, in good light.",
  challenge: "This proves a real person is in front of the camera.",
  capture: "Look straight at the camera.",
  matching: "Checking the scan.",
  success: "",
  failed: "",
};

async function poll<T>(
  isCancelled: () => boolean,
  timeoutMs: number,
  timeoutMessage: string,
  step: () => Promise<T | undefined>,
): Promise<T> {
  const startedAt = Date.now();
  while (!isCancelled()) {
    if (Date.now() - startedAt > timeoutMs) throw new ScanError(timeoutMessage);
    const value = await step();
    if (value !== undefined) return value;
    await sleep(POLL_MS);
  }
  throw new ScanError("cancelled");
}

export function FaceScanner({ mode, onCapture, onSuccess, onCancel }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [captured, setCaptured] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [debugText, setDebugText] = useState("");
  const [debug] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
  );

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const isCancelled = () => cancelled;

    async function openCamera(video: HTMLVideoElement): Promise<void> {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (cancelled) return;
      video.srcObject = stream;
      await video.play();
    }

    async function waitForAlignedFace(faceapi: FaceApi, video: HTMLVideoElement) {
      let streak = 0;
      await poll(isCancelled, ALIGN_TIMEOUT_MS, "We couldn't see your face. Face the camera in good light.", async () => {
        const reading = await readFace(faceapi, video);
        const aligned = reading && reading.sizeRatio >= MIN_FACE_SIZE && isFrontal(reading.pose);
        streak = aligned ? streak + 1 : 0;
        return streak >= ALIGN_FRAMES ? true : undefined;
      });
    }

    async function runLivenessChallenge(faceapi: FaceApi, video: HTMLVideoElement) {
      const picked = pickChallenge();
      setChallenge(picked);
      setPhase("challenge");
      const poses: PoseSample[] = [];
      await poll(isCancelled, CHALLENGE_TIMEOUT_MS, "Liveness check failed. Blink or turn your head when asked.", async () => {
        const reading = await readFace(faceapi, video);
        if (reading) {
          poses.push(reading.pose);
          if (debug) {
            setDebugText(`ear ${reading.pose.ear.toFixed(2)}  yaw ${reading.pose.yaw.toFixed(2)}  frames ${poses.length}`);
          }
        }
        return isChallengeMet(picked, poses) ? true : undefined;
      });
    }

    async function captureSamples(faceapi: FaceApi, video: HTMLVideoElement): Promise<number[][]> {
      const wanted = SAMPLES_BY_MODE[mode];
      const samples: number[][] = [];
      setPhase("capture");
      setCaptured(0);
      await poll(isCancelled, CAPTURE_TIMEOUT_MS, "We couldn't get a steady scan. Look straight at the camera.", async () => {
        const reading: FaceReading | null = await readFace(faceapi, video, true);
        const usable =
          reading?.descriptor && isFrontal(reading.pose) && reading.pose.ear >= MIN_EAR_FOR_CAPTURE;
        if (usable) {
          samples.push(reading.descriptor);
          setCaptured(samples.length);
          if (samples.length >= wanted) return true;
          await sleep(CAPTURE_GAP_MS);
        }
        return undefined;
      });
      return samples;
    }

    async function run() {
      try {
        setError(null);
        setChallenge(null);
        setPhase("starting");
        const video = videoRef.current;
        if (!video) return;
        await openCamera(video);
        if (cancelled) return;

        setPhase("loading");
        const faceapi = await loadFaceEngine();
        if (cancelled) return;

        setPhase("align");
        await waitForAlignedFace(faceapi, video);
        await runLivenessChallenge(faceapi, video);
        const samples = await captureSamples(faceapi, video);

        setPhase("matching");
        await onCapture(samples);
        if (cancelled) return;

        setPhase("success");
        await sleep(SUCCESS_HOLD_MS);
        if (!cancelled) onSuccess();
      } catch (e: unknown) {
        if (cancelled) return;
        setError(describeScanError(e));
        setPhase("failed");
      }
    }

    run();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
    // onCapture / onSuccess are intentionally read once per attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, mode]);

  const wanted = SAMPLES_BY_MODE[mode];
  const scanning = phase === "align" || phase === "challenge" || phase === "capture" || phase === "loading";

  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Face scan">
      <div className={`scanner phase-${phase}`}>
        <div className="scan-frame">
          <video ref={videoRef} muted playsInline aria-hidden="true" />
          <svg className="scan-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="ring-track" cx="100" cy="100" r="94" />
            <circle className="ring-spin" cx="100" cy="100" r="94" />
            <path className="ring-check" d="M62 104 L90 132 L142 72" />
          </svg>
          {scanning && <div className="scan-line" aria-hidden="true" />}
        </div>

        <p className="scan-title" role="status">
          {titleFor(phase, mode, challenge)}
        </p>
        <p className="scan-hint">{phase === "failed" ? error : HINTS[phase]}</p>
        {debug && <p className="scan-hint" aria-hidden="true">{debugText}</p>}

        {(phase === "capture" || phase === "matching") && (
          <div className="scan-dots" aria-hidden="true">
            {Array.from({ length: wanted }, (_, i) => (
              <span key={i} className={i < captured ? "dot-on" : undefined} />
            ))}
          </div>
        )}

        <div className="scan-actions">
          {phase === "failed" && (
            <button className="btn primary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          )}
          {phase !== "success" && (
            <button className="btn link" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
