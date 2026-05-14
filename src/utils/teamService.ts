import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';
import type { Team } from '@/src/types';

// Create a new team
export const createTeam = async (
  teamData: Omit<Team, 'id' | 'wins' | 'losses' | 'draws' | 'skillRating' | 'trustScore' | 'createdAt' | 'players'>,
  userId: string
): Promise<string> => {
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    if (userSnap.data().teamId) throw new Error('You are already in a team');

    const teamCode = 'PCT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const teamRef = doc(collection(db, 'teams'));

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

    transaction.set(teamRef, newTeam);
    transaction.update(userRef, {
      teamId: teamRef.id,
      isFreeAgent: false,
    });

    return teamRef.id;
  });
};

// Get a team by ID
export const getTeam = async (teamId: string): Promise<Team | null> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (teamDoc.exists()) {
    return { id: teamDoc.id, ...teamDoc.data() } as Team;
  }
  return null;
};

// Respond to join request
export const respondToJoinRequest = async (requestId: string, approve: boolean): Promise<void> => {
  return await runTransaction(db, async (transaction) => {
    const reqRef = doc(db, 'teamJoinRequests', requestId);
    const reqSnap = await transaction.get(reqRef);
    if (!reqSnap.exists()) return;
    const data = reqSnap.data();

    if (approve) {
      const teamRef = doc(db, 'teams', data.teamId);
      const userRef = doc(db, 'users', data.userId);
      const userSnap = await transaction.get(userRef);
      
      if (userSnap.exists() && userSnap.data().teamId) {
        throw new Error('User is already in a team');
      }

      transaction.update(teamRef, { players: arrayUnion(data.userId) });
      transaction.update(userRef, { teamId: data.teamId, isFreeAgent: false });
      transaction.delete(reqRef);

      // Notify player
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        type: 'join_approved',
        toUserId: data.userId,
        teamId: data.teamId,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } else {
      transaction.delete(reqRef);
    }
  });
};

// Invite player to team
export const invitePlayerToTeam = async (teamId: string, teamName: string, captainId: string, playerId: string): Promise<void> => {
  await addDoc(collection(db, 'notifications'), {
    type: 'team_invite',
    toUserId: playerId,
    fromTeamId: teamId,
    fromTeamName: teamName,
    fromUserId: captainId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    read: false,
  });
};

// Start a conversation
export const startConversation = (userA: string, userB: string) => {
  const chatId = [userA, userB].sort().join('_');
  return chatId;
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
  return await runTransaction(db, async (transaction) => {
    const teamRef = doc(db, 'teams', teamId);
    const userRef = doc(db, 'users', userId);
    
    const [teamSnap, userSnap] = await Promise.all([
      transaction.get(teamRef),
      transaction.get(userRef)
    ]);

    if (teamSnap.exists() && userSnap.exists()) {
      const teamData = teamSnap.data();
      const players = teamData.players || [];
      if (!players.includes(userId)) {
        transaction.update(teamRef, {
          players: arrayUnion(userId),
        });
        transaction.update(userRef, {
          teamId: teamId,
          isFreeAgent: false,
        });
      }
    }
  });
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
      fromUserId: userId,
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
