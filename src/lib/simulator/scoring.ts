import type { Choix } from './types';

export interface RunState {
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
}

export function applyDecision(state: RunState, choix: Choix): RunState {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return {
    score: clamp(state.score + choix.impactScore),
    satisfactionClient: clamp(state.satisfactionClient + choix.impactSatisfaction),
    santeFinanciere: clamp(state.santeFinanciere + choix.impactFinancier),
    moralEquipe: clamp(state.moralEquipe + choix.impactMoral),
  };
}

export function isCrisis(state: RunState): boolean {
  return state.satisfactionClient < 30 || state.santeFinanciere < 20;
}
