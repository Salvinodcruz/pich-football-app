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
    isFreeAgent: false,
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
        isFreeAgent: false,
      });
    }
  }
};

// Request to join a team
export const requestToJoinTeam = async (teamId: string, userId: string, userName: string): Promise<void> => {
  const q = query(
    collection(db, 'teamJoinRequests'),
    where('teamId', '==', teamId),
    where('userId', '==', userId),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('Request already pending');

  await addDoc(collection(db, 'teamJoinRequests'), {
    teamId,
    userId,
    userName,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Notify captain
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  const captainId = teamDoc.data()?.captainId;
  if (captainId) {
    await addDoc(collection(db, 'notifications'), {
      type: 'join_request',
      toUserId: captainId,
      fromUserName: userName,
      teamId,
      teamName: teamDoc.data()?.name,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }
};

// Get pending join requests for a team
export const getPendingJoinRequests = async (teamId: string): Promise<any[]> => {
  const q = query(
    collection(db, 'teamJoinRequests'),
    where('teamId', '==', teamId),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Respond to join request
export const respondToJoinRequest = async (requestId: string, approve: boolean): Promise<void> => {
  const reqDoc = await getDoc(doc(db, 'teamJoinRequests', requestId));
  if (!reqDoc.exists()) return;
  const data = reqDoc.data();

  if (approve) {
    await addPlayerToTeam(data.teamId, data.userId);
    await updateDoc(doc(db, 'teamJoinRequests', requestId), { status: 'approved' });
    
    // Notify player
    await addDoc(collection(db, 'notifications'), {
      type: 'join_approved',
      toUserId: data.userId,
      teamId: data.teamId,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } else {
    await updateDoc(doc(db, 'teamJoinRequests', requestId), { status: 'denied' });
  }
};