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

export async function getCvSession(): Promise<CvSession> {
  if (session) return session;
  const stream = await openCamera();
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  const cursor = createHandCursorSource();
  await cursor.start(video);
  session = { video, cursor };
  return session;
}

export function peekCvSession(): CvSession | null {
  return session;
}

export function stopCvSession(): void {
  if (!session) return;
  session.cursor.stop();
  const stream = session.video.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  session.video.srcObject = null;
  session = null;
}
