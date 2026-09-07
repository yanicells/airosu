import { openCamera } from './camera';
import { createHandCursorSource } from './cursorSource';
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

export function getCvSession(): Promise<CvSession> {
  if (session) return Promise.resolve(session);
  if (pending) return pending;
  const current = generation;
  pending = (async () => {
    const stream = await openCamera();
    const video = document.createElement('video');
    const cursor = createHandCursorSource();
    try {
      if (current !== generation) throw new Error('Camera session stopped');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await cursor.start(video);
      if (current !== generation) throw new Error('Camera session stopped');
      session = { video, cursor };
      return session;
    } catch (error) {
      cursor.stop();
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      throw error;
    }
  })().finally(() => {
    if (current === generation) pending = null;
  });
  return pending;
}

export function peekCvSession(): CvSession | null {
  return session;
}

export function stopCvSession(): void {
  generation++;
  pending = null;
  if (!session) return;
  session.cursor.stop();
  const stream = session.video.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  session.video.srcObject = null;
  session = null;
}
