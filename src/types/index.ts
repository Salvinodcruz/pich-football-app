export interface User {
  id: string;
  name: string;
  email: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  emirate: 'Sharjah' | 'Dubai' | 'Ajman';
  skillRating: number;
  teamId: string | null;
  isFreeAgent: boolean;
  isCasual: boolean;
  matches: number;
  goals: number;
  assists: number;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  emirate: 'Sharjah' | 'Dubai' | 'Ajman';
  format: '5-a-side' | '7-a-side' | '11-a-side';
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  color: string;
  players: string[];
  wins: number;
  losses: number;
  draws: number;
  skillRating: number;
  trustScore: number;
  createdAt: string;
}

export interface Challenge {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  format: '5-a-side' | '7-a-side' | '11-a-side';
  matchType: 'Friendly' | 'Rated';
  date: string;
  time: string;
  venue: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  format: '5-a-side' | '7-a-side' | '11-a-side';
  matchType: 'Friendly' | 'Rated' | 'Tournament';
  date: string;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'completed' | 'disputed';
  createdAt: string;
}
