export type EventType = 'goal' | 'save' | 'yellow_card' | 'red_card';
export type GoalType = 'long_shot' | 'tap_in' | 'free_kick' | 'penalty' | 'header' | 'volley';
export type TimerPhase = 'pre' | 'first_half' | 'half_time' | 'second_half' | 'full_time';
export type MatchStructure = 'full' | 'halves';

export interface MatchPlayer {
  id: string;
  name: string;
  photoURL?: string;
  position?: string;
  isGK: boolean;
  isPlaying: boolean;
}

export interface MatchConfig {
  structure: MatchStructure;
  /** Minutes per half. For 'full' mode this equals total match minutes. */
  halfMinutes: number;
  breakMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
  format: string;
  challengeId?: string;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId: string;
  playerName: string;
  minute: number;
  half: 1 | 2;
  goalType?: GoalType;
  assistPlayerId?: string;
  assistPlayerName?: string;
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  photoURL?: string;
  isGK: boolean;
  goals: number;
  assists: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  rating: number; // 1.0 – 10.0
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function computePlayerStats(
  events: MatchEvent[],
  roster: MatchPlayer[],
): PlayerMatchStats[] {
  return roster
    .filter(p => p.isPlaying)
    .map(p => {
      const goals       = events.filter(e => e.type === 'goal'        && e.playerId === p.id).length;
      const assists     = events.filter(e => e.type === 'goal'        && e.assistPlayerId === p.id).length;
      const saves       = events.filter(e => e.type === 'save'        && e.playerId === p.id).length;
      const yellowCards = events.filter(e => e.type === 'yellow_card' && e.playerId === p.id).length;
      const redCards    = events.filter(e => e.type === 'red_card'    && e.playerId === p.id).length;
      const rating      = calcRating({ goals, assists, saves, yellowCards, redCards, isGK: p.isGK });
      return { playerId: p.id, playerName: p.name, photoURL: p.photoURL, isGK: p.isGK, goals, assists, saves, yellowCards, redCards, rating };
    });
}

export function calcRating({
  goals, assists, saves, yellowCards, redCards, isGK,
}: Pick<PlayerMatchStats, 'goals' | 'assists' | 'saves' | 'yellowCards' | 'redCards' | 'isGK'>): number {
  let r = 6.0;
  if (isGK) {
    r += Math.min(saves * 0.3, 3.0);
    r += goals * 0.5;
    r += assists * 0.3;
  } else {
    r += goals * 1.0;
    r += assists * 0.5;
  }
  r -= yellowCards * 0.5;
  r -= redCards * 1.5;
  return Math.round(Math.max(1.0, Math.min(10.0, r)) * 10) / 10;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  long_shot: 'Long Shot',
  tap_in:    'Tap-In',
  free_kick: 'Free Kick',
  penalty:   'Penalty',
  header:    'Header',
  volley:    'Volley',
};
