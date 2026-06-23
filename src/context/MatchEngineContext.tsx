import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MatchPlayer, MatchConfig, MatchEvent } from '@/src/types/matchEngine';

// ─── State ─────────────────────────────────────────────────────────────────────

interface MatchEngineState {
  roster: MatchPlayer[];
  config: MatchConfig | null;
  events: MatchEvent[];
  opponentScore: number;
  pitchCost: number;
}

const initial: MatchEngineState = {
  roster: [],
  config: null,
  events: [],
  opponentScore: 0,
  pitchCost: 0,
};

// ─── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_ROSTER';         payload: MatchPlayer[] }
  | { type: 'SET_CONFIG';         payload: MatchConfig }
  | { type: 'ADD_EVENT';          payload: MatchEvent }
  | { type: 'REMOVE_EVENT';       payload: string }
  | { type: 'SET_OPPONENT_SCORE'; payload: number }
  | { type: 'SET_PITCH_COST';     payload: number }
  | { type: 'RESET' };

function reducer(state: MatchEngineState, action: Action): MatchEngineState {
  switch (action.type) {
    case 'SET_ROSTER':
      return { ...state, roster: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'REMOVE_EVENT':
      return { ...state, events: state.events.filter(e => e.id !== action.payload) };
    case 'SET_OPPONENT_SCORE':
      return { ...state, opponentScore: Math.max(0, action.payload) };
    case 'SET_PITCH_COST':
      return { ...state, pitchCost: Math.max(0, action.payload) };
    case 'RESET':
      return initial;
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

interface MatchEngineContextValue {
  state: MatchEngineState;
  setRoster: (players: MatchPlayer[]) => void;
  setConfig: (config: MatchConfig) => void;
  addEvent: (event: MatchEvent) => void;
  removeEvent: (id: string) => void;
  setOpponentScore: (score: number) => void;
  setPitchCost: (cost: number) => void;
  resetMatch: () => void;
  /** Goals scored by the captain's team (goal events). */
  myScore: number;
}

const MatchEngineContext = createContext<MatchEngineContextValue | undefined>(undefined);

export function MatchEngineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const myScore = state.events.filter(e => e.type === 'goal').length;

  const value: MatchEngineContextValue = {
    state,
    setRoster:        (p) => dispatch({ type: 'SET_ROSTER',         payload: p }),
    setConfig:        (c) => dispatch({ type: 'SET_CONFIG',         payload: c }),
    addEvent:         (e) => dispatch({ type: 'ADD_EVENT',          payload: e }),
    removeEvent:      (id) => dispatch({ type: 'REMOVE_EVENT',      payload: id }),
    setOpponentScore: (s) => dispatch({ type: 'SET_OPPONENT_SCORE', payload: s }),
    setPitchCost:     (c) => dispatch({ type: 'SET_PITCH_COST',     payload: c }),
    resetMatch:       ()  => dispatch({ type: 'RESET' }),
    myScore,
  };

  return (
    <MatchEngineContext.Provider value={value}>
      {children}
    </MatchEngineContext.Provider>
  );
}

export function useMatchEngine(): MatchEngineContextValue {
  const ctx = useContext(MatchEngineContext);
  if (!ctx) throw new Error('useMatchEngine must be used inside <MatchEngineProvider>');
  return ctx;
}
