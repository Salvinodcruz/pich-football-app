import {
  collection, doc, addDoc, getDoc,
  getDocs, updateDoc, query, orderBy, onSnapshot,
  arrayUnion, arrayRemove
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

export const subscribeToTournament = (
  id: string,
  callback: (data: any) => void
) => {
  return onSnapshot(doc(db, 'tournaments', id), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
};

export const joinTournament = async (
  tournamentId: string,
  teamId: string
): Promise<void> => {
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    teams: arrayUnion(teamId),
  });
};

export const leaveTournament = async (
  tournamentId: string,
  teamId: string
): Promise<void> => {
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    teams: arrayRemove(teamId),
  });
};

export const updateTournamentDescription = async (
  tournamentId: string,
  description: string
): Promise<void> => {
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    description,
  });
};