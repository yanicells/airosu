/** Shared AudioContext for skin sound effects (separate from the game clock). */
let ctx: AudioContext | null = null;

export function soundContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export async function decodeSound(bytes: Uint8Array): Promise<AudioBuffer> {
  return soundContext().decodeAudioData(bytes.slice().buffer as ArrayBuffer);
}

export function playSound(buffer: AudioBuffer, volume: number): void {
  const c = soundContext();
  const gain = c.createGain();
  gain.gain.value = volume;
  gain.connect(c.destination);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.start();
}
