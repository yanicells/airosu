import { describe, it, expect } from 'vitest';
import type { LoadedBeatmap } from '../beatmap/model';
import { defaultSettings } from '../ui/appState';
import type { Settings } from '../ui/appState';
import { GameSession, sliderBallPos } from './session';

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

describe('sliderBallPos', () => {
  const slider = (repeats: number): import('../beatmap/model').SliderObj => ({
    kind: 'slider',
    time: 1000,
    endTime: 2000,
    repeats,
    pos: { x: 0, y: 0 },
    path: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  });

  it('interpolates single span', () => {
    const p = sliderBallPos(slider(1), 1500);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(0);
  });

  it('two spans: turning point at midpoint time', () => {
    expect(sliderBallPos(slider(2), 1500).x).toBeCloseTo(100);
    expect(sliderBallPos(slider(2), 1750).x).toBeCloseTo(50);
  });
});

describe('slider judgment', () => {
  const sliderMap = () =>
    makeMap([
      {
        kind: 'slider',
        time: 1000,
        endTime: 2000,
        repeats: 1,
        pos: { x: 0, y: 0 },
        path: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
    ]);

  it('cursor glued to ball → final 300', () => {
    const s = new GameSession(sliderMap(), relax);
    const all: number[] = [];
    for (let t = 1000; t <= 2000; t += 20) {
      const ball = sliderBallPos(sliderMap().objects[0] as import('../beatmap/model').SliderObj, t);
      for (const e of s.tick(t, ball)) all.push(e.judgment);
    }
    expect(all[0]).toBe(300); // head
    expect(all[1]).toBe(300); // slider end
    expect(s.state.finished).toBe(true);
  });

  it('cursor absent whole slider → 0', () => {
    const s = new GameSession(sliderMap(), relax);
    const all: number[] = [];
    for (let t = 1000; t <= 2000; t += 20) for (const e of s.tick(t, null)) all.push(e.judgment);
    // head miss + follow 0
    expect(all).toContain(0);
    expect(all[all.length - 1]).toBe(0);
    expect(s.state.finished).toBe(true);
  });
});
