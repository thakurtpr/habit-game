import { averageEar, yawRatio, type PoseSample } from "./liveness";

export type FaceApi = typeof import("@vladmandic/face-api");

const MODEL_URL = "/models";
const DETECTOR_INPUT_SIZE = 320;
const DETECTOR_MIN_SCORE = 0.5;

export interface FaceReading {
  /** Only computed when requested; it is the slowest step. */
  readonly descriptor: number[] | null;
  readonly pose: PoseSample;
  /** Face width as a fraction of the video width (how close the user is). */
  readonly sizeRatio: number;
}

let enginePromise: Promise<FaceApi> | null = null;

/** Loads the TensorFlow bundle and the three face models once, on first use. */
export function loadFaceEngine(): Promise<FaceApi> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      // The bundled TensorFlow typings omit `ready`, but it exists at runtime.
      await (faceapi.tf as unknown as { ready: () => Promise<void> }).ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })().catch((error: unknown) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

/** Reads the largest face in the current video frame, or null if none is found. */
export async function readFace(
  faceapi: FaceApi,
  video: HTMLVideoElement,
  withDescriptor = false,
): Promise<FaceReading | null> {
  const task = faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: DETECTOR_INPUT_SIZE,
        scoreThreshold: DETECTOR_MIN_SCORE,
      }),
    )
    .withFaceLandmarks(true);
  const result = withDescriptor ? await task.withFaceDescriptor() : await task;
  if (!result || video.videoWidth === 0) return null;

  const points = result.landmarks.positions;
  return {
    descriptor: "descriptor" in result ? Array.from(result.descriptor as Float32Array) : null,
    pose: { ear: averageEar(points), yaw: yawRatio(points) },
    sizeRatio: result.detection.box.width / video.videoWidth,
  };
}
