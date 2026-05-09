import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, query, where, orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

// Send friend request
export const sendFriendRequest = async (
  fromUserId: string,
  fromName: string,
  fromPhotoURL: string | null,
  toUserId: string,
): Promise<void> => {
  // Check not already friends or pending
  const existing = await getDocs(
    query(collection(db, 'friendships'),
      where('users', 'array-contains', fromUserId))
  );
  const alreadyExists = existing.docs.some(d => {
    const data = d.data();
    return data.users.includes(toUserId) && (data.status === 'accepted' || data.status === 'pending');
  });
  if (alreadyExists) throw new Error('Friend request already sent or you are already friends');

  // Send notification
  await addDoc(collection(db, 'notifications'), {
    type: 'friend_request',
    toUserId,
    fromUserId,
    fromName,
    fromPhotoURL: fromPhotoURL || null,
    status: 'pending',
    read: false,
    createdAt: new Date().toISOString(),
  });

  // Create friendship record
  await addDoc(collection(db, 'friendships'), {
    users: [fromUserId, toUserId],
    requestedBy: fromUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
};

// Accept friend request
export const acceptFriendRequest = async (
  friendshipId: string,
  acceptingUserId: string,
  acceptingName: string,
  requestingUserId: string,
): Promise<void> => {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  });

  // Notify requester
  await addDoc(collection(db, 'notifications'), {
    type: 'friend_accepted',
    toUserId: requestingUserId,
    fromUserId: acceptingUserId,
    fromName: acceptingName,
    status: 'pending',
    read: false,
    createdAt: new Date().toISOString(),
  });
};

// Get friends list
export const getFriends = async (userId: string): Promise<any[]> => {
  const snap = await getDocs(
    query(collection(db, 'friendships'),
      where('users', 'array-contains', userId),
      where('status', '==', 'accepted'))
  );

  const friends: any[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const friendId = data.users.find((u: string) => u !== userId);
    if (!friendId) continue;
    const userDoc = await getDoc(doc(db, 'users', friendId));
    if (userDoc.exists()) {
      friends.push({ id: userDoc.id, friendshipId: d.id, ...userDoc.data() });
    }
  }
  return friends;
};

// Get pending friend requests
export const getPendingRequests = async (userId: string): Promise<any[]> => {
  const snap = await getDocs(
    query(collection(db, 'friendships'),
      where('users', 'array-contains', userId),
      where('status', '==', 'pending'))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((d: any) => d.requestedBy !== userId); // only incoming
};

// Remove friend
export const removeFriend = async (friendshipId: string): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'friendships', friendshipId));
  await batch.commit();
};

// Create pickup team from friends
export const createPickupTeam = async (
  captainId: string,
  captainName: string,
  teamName: string,
  friendIds: string[],
  format: string,
  emirate: string,
): Promise<string> => {
  const allPlayers = [captainId, ...friendIds];
  const docRef = await addDoc(collection(db, 'teams'), {
    name: teamName,
    captainId,
    captainName,
    players: allPlayers,
    format,
    emirate,
    skillLevel: 'Casual',
    color: '#4FC3F7',
    isPickup: true,
    pickupExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    wins: 0, losses: 0, draws: 0,
    skillRating: 0, trustScore: 100,
    createdAt: new Date().toISOString(),
    teamCode: 'PCT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
  });

  // Save permanent team and switch to pickup
  for (const pid of allPlayers) {
    const pDoc = await getDoc(doc(db, 'users', pid));
    const currentTeamId = pDoc.data()?.teamId;
    await updateDoc(doc(db, 'users', pid), {
      teamId: docRef.id,
      permanentTeamId: currentTeamId || null,
    });
  }

  return docRef.id;
};

export const deletePickupTeam = async (teamId: string): Promise<void> => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) return;
  const data = teamDoc.data();

  const batch = writeBatch(db);

  // Switch all players back to their permanent team
  for (const pid of data.players || []) {
    const pDoc = await getDoc(doc(db, 'users', pid));
    if (pDoc.exists() && pDoc.data().teamId === teamId) {
      const permTeamId = pDoc.data().permanentTeamId || null;
      batch.update(doc(db, 'users', pid), {
        teamId: permTeamId,
        permanentTeamId: null,
      });
    }
  }

  batch.delete(doc(db, 'teams', teamId));
  await batch.commit();
};


// Convert pickup team to permanent
export const convertPickupToPermanent = async (teamId: string): Promise<void> => {
  await updateDoc(doc(db, 'teams', teamId), {
    isPickup: false,
    pickupExpiresAt: null,
  });
};

// Delete expired pickup teams
export const cleanupExpiredPickupTeams = async (): Promise<void> => {
  const now = new Date().toISOString();
  const snap = await getDocs(
    query(collection(db, 'teams'), where('isPickup', '==', true))
  );
  const batch = writeBatch(db);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.pickupExpiresAt && data.pickupExpiresAt < now) {
      // Remove team from all players but keep their stats
      for (const pid of data.players || []) {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists() && pDoc.data().teamId === d.id) {
          batch.update(doc(db, 'users', pid), { teamId: null });
        }
      }
      batch.delete(d.ref);
    }
  }
  await batch.commit();
};