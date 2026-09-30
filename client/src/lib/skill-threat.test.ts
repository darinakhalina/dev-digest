import { describe, it, expect } from "vitest";
import { resolveSkillThreat } from "./skill-threat";

describe("resolveSkillThreat", () => {
  it("blocks a dangerous skill nobody accepted", () => {
    const state = resolveSkillThreat({ threat_level: "dangerous", threat_accepted_at: null });
    expect(state.isBlocked).toBe(true);
    expect(state.isAcceptedDanger).toBe(false);
    expect(state.tone).toBe("danger");
  });

  it("keeps the mark, but stops blocking, once the risk is accepted", () => {
    const state = resolveSkillThreat({
      threat_level: "dangerous",
      threat_accepted_at: "2026-09-27T10:00:00.000Z",
    });
    expect(state.isBlocked).toBe(false);
    expect(state.isAcceptedDanger).toBe(true);
    expect(state.tone).toBe("danger");
  });

  it("warns about a suspicious skill without blocking it", () => {
    const state = resolveSkillThreat({ threat_level: "suspicious", threat_accepted_at: null });
    expect(state.isBlocked).toBe(false);
    expect(state.tone).toBe("warn");
  });

  it("says nothing about a safe skill", () => {
    const state = resolveSkillThreat({ threat_level: "safe", threat_accepted_at: null });
    expect(state.tone).toBeNull();
    expect(state.isBlocked).toBe(false);
  });

  it("treats a skill from a server that never scanned it as unmarked, not unsafe", () => {
    const state = resolveSkillThreat({ threat_level: "unknown", threat_accepted_at: undefined });
    expect(state.tone).toBeNull();
    expect(state.isBlocked).toBe(false);
  });
});
