import {
  collection, doc, addDoc, getDoc,
  getDocs, updateDoc, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export interface Challenge {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamColor: string;
  toTeamId: string;
  toTeamName: string;
  toTeamColor: string;
  format: string;
  matchType: 'Friendly' | 'Rated';
  date: string;
  time: string;
  isoDate?: string; // Proper ISO-8601 string for sorting and logic
  venue: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// Send a challenge + notify opponent captain
export const sendChallenge = async (
  challenge: Omit<Challenge, 'id' | 'status' | 'createdAt' | 'expiresAt'>
): Promise<string> => {
  try {
    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const docRef = await addDoc(collection(db, 'challenges'), {
      ...challenge,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });

    // Notify opponent team captain
    try {
      const toTeamDoc = await getDoc(doc(db, 'teams', challenge.toTeamId));
      if (toTeamDoc.exists()) {
        const captainId = toTeamDoc.data().captainId;
        if (captainId) {
          await addDoc(collection(db, 'notifications'), {
            type: 'challenge_received',
            toUserId: captainId,
            fromTeamId: challenge.fromTeamId,
            fromTeamName: challenge.fromTeamName,
            format: challenge.format,
            matchType: challenge.matchType,
            matchDate: challenge.date,
            matchTime: challenge.time,
            venue: challenge.venue,
            challengeId: docRef.id,
            status: 'pending',
            read: false,
            createdAt: now.toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('Notification error:', e);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error sending challenge:', error);
    throw error;
  }
};

// Accept a challenge + notify challenger captain
export const acceptChallenge = async (challengeId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'challenges', challengeId), {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    // Notify the team that sent the challenge
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (challengeDoc.exists()) {
        const data = challengeDoc.data();
        const fromTeamDoc = await getDoc(doc(db, 'teams', data.fromTeamId));
        if (fromTeamDoc.exists()) {
          const captainId = fromTeamDoc.data().captainId;
          if (captainId) {
            await addDoc(collection(db, 'notifications'), {
              type: 'challenge_accepted',
              toUserId: captainId,
              fromTeamId: data.toTeamId,
              fromTeamName: data.toTeamName,
              matchDate: data.date,
              matchTime: data.time,
              venue: data.venue,
              challengeId,
              status: 'pending',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error('Accept notification error:', e);
    }
  } catch (error) {
    console.error('Error accepting challenge:', error);
    throw error;
  }
};

// Decline a challenge + notify challenger
export const declineChallenge = async (challengeId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'challenges', challengeId), {
      status: 'declined',
    });

    // Notify the team that sent the challenge
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (challengeDoc.exists()) {
        const data = challengeDoc.data();
        const fromTeamDoc = await getDoc(doc(db, 'teams', data.fromTeamId));
        if (fromTeamDoc.exists()) {
          const captainId = fromTeamDoc.data().captainId;
          if (captainId) {
            await addDoc(collection(db, 'notifications'), {
              type: 'challenge_declined',
              toUserId: captainId,
              fromTeamId: data.toTeamId,
              fromTeamName: data.toTeamName,
              matchDate: data.date,
              matchTime: data.time,
              challengeId,
              status: 'pending',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error('Decline notification error:', e);
    }
  } catch (error) {
    console.error('Error declining challenge:', error);
    throw error;
  }
};

// Get incoming challenges for a team
export const getIncomingChallenges = async (teamId: string): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('toTeamId', '==', teamId),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
};

// Get outgoing challenges from a team
export const getOutgoingChallenges = async (teamId: string): Promise<Challenge[]> => {
  const q = query(
    collection(db, 'challenges'),
    where('fromTeamId', '==', teamId),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
};