/** Output latency above this is treated as a bogus browser report. */
const MAX_LATENCY_MS = 500;

/** Master game clock backed by Web Audio playback. */
export class AudioClock {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode;
  private startTime = 0;
  private stopped = false;

  private constructor(ctx: AudioContext, source: AudioBufferSourceNode) {
    this.ctx = ctx;
    this.source = source;
  }

  static async create(audio: ArrayBuffer, volume: number): Promise<AudioClock> {
    const ctx = new AudioContext();
    try {
      const buffer = await ctx.decodeAudioData(audio.slice(0));
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      return new AudioClock(ctx, source);
    } catch (error) {
      await ctx.close();
      throw error;
    }
  }

  /** Starts the song after leadInMs of silence; the clock reads negative until then. */
  start(leadInMs = 0): void {
    this.startTime = this.ctx.currentTime + leadInMs / 1000;
    this.source.start(this.startTime);
  }

  /**
   * Song position the player is hearing right now, in ms. Context time runs ahead of the
   * speakers by the output latency (tens of ms wired, 150–250 ms Bluetooth), so subtract it;
   * offsetMs is the user's own calibration on top.
   */
  nowMs(offsetMs: number): number {
    return (this.ctx.currentTime - this.startTime) * 1000 - this.latencyMs() + offsetMs;
  }

  private latencyMs(): number {
    const ms = (this.ctx.outputLatency || this.ctx.baseLatency || 0) * 1000;
    return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), MAX_LATENCY_MS) : 0;
  }

  get running(): boolean {
    return !this.stopped && this.ctx.state === 'running';
  }

  pause(): void {
    if (!this.stopped) void this.ctx.suspend().catch(() => {});
  }

  async resume(): Promise<void> {
    if (this.stopped) throw new Error('Audio has stopped');
    await this.ctx.resume();
    if (!this.running) throw new Error('Audio could not resume. Try restarting the map.');
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.source.stop();
    } catch {
      // not started yet
    }
    void this.ctx.close();
  }
}
