import { describe, it, expect } from 'vitest';
import type { LoadedBeatmap } from '../beatmap/model';
import { defaultSettings } from '../ui/appState';
import type { Settings } from '../ui/appState';
import { GameSession } from './session';

function makeMap(objects: LoadedBeatmap['objects']): LoadedBeatmap {
  return {
    meta: {
      title: 't',
      artist: 'a',
      version: 'v',
      audioFilename: 'x.mp3',
      cs: 4,
      od: 5,
      ar: 5,
    },
    objects,
    audio: new ArrayBuffer(0),
  };
}

const twoCircles = () =>
  makeMap([
    { kind: 'circle', time: 1000, pos: { x: 100, y: 100 } },
    { kind: 'circle', time: 2000, pos: { x: 200, y: 200 } },
  ]);

const relax: Settings = { ...defaultSettings, inputMode: 'relax', forgiveness: 1 };
const manual: Settings = { ...defaultSettings, inputMode: 'manual', forgiveness: 1 };

describe('GameSession relax', () => {
  it('auto-hits when cursor on object at hit time', () => {
    const s = new GameSession(twoCircles(), relax);
    const events = s.tick(1000, { x: 100, y: 100 });
    expect(events).toHaveLength(1);
    expect(events[0].judgment).toBe(300);
  });

  it('misses when cursor far past window', () => {
    const s = new GameSession(twoCircles(), relax);
    const events = s.tick(1200, { x: 500, y: 50 });
    expect(events).toHaveLength(1);
    expect(events[0].judgment).toBe(0);
  });
});

describe('GameSession manual', () => {
  it('press on object hits', () => {
    const s = new GameSession(twoCircles(), manual);
    s.tick(1005, { x: 100, y: 100 });
    const e = s.press(1005, { x: 100, y: 100 });
    expect(e?.judgment).toBe(300);
  });

  it('stray press ignored', () => {
    const s = new GameSession(twoCircles(), manual);
    s.tick(1005, { x: 400, y: 300 });
    expect(s.press(1005, { x: 400, y: 300 })).toBeNull();
  });

  it('unpressed object misses on tick past window', () => {
    const s = new GameSession(twoCircles(), manual);
    const events = s.tick(1200, { x: 100, y: 100 });
    expect(events[0]?.judgment).toBe(0);
  });
});

describe('GameSession lifecycle', () => {
  it('finishes after all objects judged', () => {
    const s = new GameSession(twoCircles(), relax);
    s.tick(1000, { x: 100, y: 100 });
    expect(s.state.finished).toBe(false);
    s.tick(2000, { x: 200, y: 200 });
    expect(s.state.finished).toBe(true);
    expect(s.state.score.maxCombo).toBe(2);
  });

  it('spinner auto-completes with 300 at endTime, no cursor', () => {
    const s = new GameSession(
      makeMap([{ kind: 'spinner', time: 1000, endTime: 2000 }]),
      relax,
    );
    expect(s.tick(1500, null)).toHaveLength(0);
    const events = s.tick(2000, null);
    expect(events[0].judgment).toBe(300);
  });

  it('preempt follows AR formula', () => {
    const s = new GameSession(twoCircles(), relax);
    expect(s.preemptMs()).toBe(1200);
  });
});
