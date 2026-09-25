import { describe, it, expect, vi, afterEach } from 'vitest';
import { RunBus } from '../src/platform/sse.js';

describe('RunBus lifecycle — SPEC-2026-09-25-run-reliability', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a completed run for late subscribers, then forgets it', () => {
    vi.useFakeTimers();
    const bus = new RunBus(1000);
    bus.publish('r1', 'info', 'hello');
    bus.complete('r1');
    expect(bus.knows('r1')).toBe(true);
    expect(bus.buffer('r1')).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(bus.knows('r1')).toBe(false);
    expect(bus.buffer('r1')).toHaveLength(0);
  });

  it('does not reopen a completed run when something publishes to it afterwards', () => {
    const bus = new RunBus();
    bus.publish('r1', 'info', 'a');
    bus.complete('r1');
    bus.publish('r1', 'info', 'late');
    expect(bus.buffer('r1').map((e) => e.msg)).toEqual(['a']);
  });

  it('ends every open stream on closeAll', () => {
    const bus = new RunBus();
    const done = vi.fn();
    bus.publish('r1', 'info', 'a');
    bus.onDone('r1', done);
    bus.closeAll();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
