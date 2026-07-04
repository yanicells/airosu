/** Master game clock backed by Web Audio playback. */
export class AudioClock {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode;
  private startTime = 0;
  private _ended = false;

  private constructor(ctx: AudioContext, source: AudioBufferSourceNode) {
    this.ctx = ctx;
    this.source = source;
    source.onended = () => {
      this._ended = true;
    };
  }

  static async create(audio: ArrayBuffer, volume: number): Promise<AudioClock> {
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(audio.slice(0));
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    return new AudioClock(ctx, source);
  }

  start(): void {
    this.startTime = this.ctx.currentTime;
    this.source.start();
  }

  nowMs(offsetMs: number): number {
    return (this.ctx.currentTime - this.startTime) * 1000 + offsetMs;
  }

  pause(): void {
    void this.ctx.suspend();
  }

  resume(): void {
    void this.ctx.resume();
  }

  stop(): void {
    try {
      this.source.stop();
    } catch {
      // not started yet
    }
    void this.ctx.close();
  }

  get ended(): boolean {
    return this._ended;
  }
}
