import type { GamePhase } from "./types";

export interface EvolveCounters {
  phase: GamePhase;
  sides: number;
  progress: number;
}

export type TapResult = "ignored" | "progress" | "evolve";

export function applyTap(state: EvolveCounters): TapResult {
  if (state.phase !== "Moving") return "ignored";
  state.progress += 1;
  if (state.progress >= state.sides) {
    state.phase = "Evolving";
    return "evolve";
  }
  return "progress";
}

/** Mid-timeline: the new polygon exists, but the world stays frozen. */
export function commitEvolution(state: EvolveCounters): void {
  state.sides += 1;
  state.progress = 0;
}

export function finishEvolution(state: EvolveCounters): void {
  state.phase = "Moving";
}
