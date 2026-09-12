import { openCamera } from './camera';
import type { CursorSource } from './cursorSource';

/**
 * App-wide camera + hand tracking session. Started on the calibration screen,
 * reused by the play screen so the tracker loads only once.
 */
export interface CvSession {
  video: HTMLVideoElement;
  cursor: CursorSource;
}

let session: CvSession | null = null;

let pending: Promise<CvSession> | null = null;
let generation = 0;
let cancelPending: (() => void) | null = null;

export function getCvSession(): Promise<CvSession> {
  if (session) return Promise.resolve(session);
  if (pending) return pending;
  const current = generation;
  pending = (async () => {
    const { createHandCursorSource } = await import('./cursorSource');
    const stream = await openCamera();
    const video = document.createElement('video');
    const cursor = createHandCursorSource();
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      cursor.stop();
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
    if (current === generation) cancelPending = cleanup;
    try {
      if (current !== generation) throw new Error('Camera session stopped');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await cursor.start(video);
      if (current !== generation) throw new Error('Camera session stopped');
      cancelPending = null;
      session = { video, cursor };
      return session;
    } catch (error) {
      cleanup();
      throw error;
    }
  })().finally(() => {
    if (current === generation) { pending = null; cancelPending = null; }
  });
  return pending;
}

export function peekCvSession(): CvSession | null {
  return session;
}

export function stopCvSession(): void {
  generation++;
  cancelPending?.();
  cancelPending = null;
  pending = null;
  if (!session) return;
  session.cursor.stop();
  const stream = session.video.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  session.video.srcObject = null;
  session = null;
}
