import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRunEvents } from "./reviews";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners: Record<string, ((ev: MessageEvent) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(kind: string, cb: EventListener) {
    (this.listeners[kind] ??= []).push(cb as (ev: MessageEvent) => void);
  }

  close() {
    this.closed = true;
  }

  emit(kind: string, data: string) {
    const ev = { data } as MessageEvent;
    if (kind === "message") this.onmessage?.(ev);
    else for (const cb of this.listeners[kind] ?? []) cb(ev);
  }

  error() {
    this.onerror?.();
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRunEvents", () => {
  it("opens one stream per run id and starts running", () => {
    const { result } = renderHook(() => useRunEvents(["r1", "r2"]));

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances.map((s) => s.url)).toEqual([
      expect.stringContaining("/runs/r1/events"),
      expect.stringContaining("/runs/r2/events"),
    ]);
    expect(result.current.running).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it("accumulates parsed events from any stream", () => {
    const { result } = renderHook(() => useRunEvents(["r1"]));
    const [es] = FakeEventSource.instances;

    act(() => {
      es!.emit("message", JSON.stringify({ runId: "r1", seq: 1, kind: "info", msg: "start", t: "00.01" }));
      es!.emit("tool", JSON.stringify({ runId: "r1", seq: 2, kind: "tool", msg: "grep", t: "00.02" }));
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0]!.msg).toBe("start");
    expect(result.current.events[1]!.msg).toBe("grep");
  });

  it("ignores a non-JSON keepalive frame instead of throwing", () => {
    const { result } = renderHook(() => useRunEvents(["r1"]));
    const [es] = FakeEventSource.instances;

    expect(() => act(() => es!.emit("message", ""))).not.toThrow();
    expect(result.current.events).toEqual([]);
  });

  it("stays running until every stream has errored, then stops", async () => {
    const { result } = renderHook(() => useRunEvents(["r1", "r2"]));
    const [a, b] = FakeEventSource.instances;

    act(() => a!.error());
    expect(result.current.running).toBe(true);

    act(() => b!.error());
    await waitFor(() => expect(result.current.running).toBe(false));
    expect(a!.closed).toBe(true);
    expect(b!.closed).toBe(true);
  });

  it("closes every open stream on unmount", () => {
    const { unmount } = renderHook(() => useRunEvents(["r1", "r2"]));
    const sources = [...FakeEventSource.instances];

    unmount();

    expect(sources.every((s) => s.closed)).toBe(true);
  });

  it("opens nothing for an empty run id list", () => {
    renderHook(() => useRunEvents([]));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
