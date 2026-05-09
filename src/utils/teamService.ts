import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import type { Team } from '@/src/types';

// Create a new team
export const createTeam = async (
  teamData: Omit<Team, 'id' | 'wins' | 'losses' | 'draws' | 'skillRating' | 'trustScore' | 'createdAt' | 'players'>,
  userId: string
): Promise<string> => {
    const teamCode = 'PCT-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const newTeam = {
      ...teamData,
      teamCode,
    players: [userId],
    wins: 0,
    losses: 0,
    draws: 0,
    skillRating: 0.0,
    trustScore: 100,
    createdAt: new Date().toISOString(),
  };


  
  const docRef = await addDoc(collection(db, 'teams'), newTeam);

  // Update user's teamId
  await updateDoc(doc(db, 'users', userId), {
    teamId: docRef.id,
  });

  return docRef.id;
};

// Get a team by ID
export const getTeam = async (teamId: string): Promise<Team | null> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (teamDoc.exists()) {
    return { id: teamDoc.id, ...teamDoc.data() } as Team;
  }
  return null;
};

// Get all teams by emirate
export const getTeamsByEmirate = async (emirate: string): Promise<Team[]> => {
  const q = query(
    collection(db, 'teams'),
    where('emirate', '==', emirate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

// Get all teams
export const getAllTeams = async (): Promise<Team[]> => {
  const snapshot = await getDocs(collection(db, 'teams'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

// Add player to team
export const addPlayerToTeam = async (teamId: string, userId: string): Promise<void> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (teamDoc.exists()) {
    const players = teamDoc.data().players || [];
    if (!players.includes(userId)) {
      await updateDoc(doc(db, 'teams', teamId), {
        players: [...players, userId],
      });
      await updateDoc(doc(db, 'users', userId), {
        teamId: teamId,
      });
    }
  }
};