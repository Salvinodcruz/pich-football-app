import {
  collection, doc, addDoc, getDoc,
  getDocs, updateDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

export const createTournament = async (
  data: any,
  creatorId: string,
  creatorTeamId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'tournaments'), {
    ...data,
    creatorId,
    creatorTeamId,
    teams: [creatorTeamId],
    status: 'open',
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getTournament = async (id: string): Promise<any> => {
  const snap = await getDoc(doc(db, 'tournaments', id));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
};

export const joinTournament = async (
  tournamentId: string,
  teamId: string
): Promise<void> => {
  const snap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (snap.exists()) {
    const teams = snap.data().teams || [];
    if (!teams.includes(teamId)) {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        teams: [...teams, teamId],
      });
    }
  }
};