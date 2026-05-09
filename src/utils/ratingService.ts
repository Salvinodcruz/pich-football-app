import {
  collection, getDocs, doc, updateDoc, getDoc, query, where,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

// Calculate raw score for a single player
export const calculateRawScore = (player: any): number => {
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const matches = player.matches || player.matchesPlayed || 0;
  const wins = player.wins || 0;
  const trustScore = player.trustScore || 100;

  // Goals contribution (max 20pts)
  const goalScore = Math.min(goals * 3, 20);

  // Assists contribution (max 15pts)
  const assistScore = Math.min(assists * 2, 15);

  // Matches contribution (max 10pts)
  const matchScore = Math.min(matches * 1, 10);

  // Win rate contribution (max 15pts)
  const winRate = matches > 0 ? (wins / matches) : 0;
  const winScore = Math.round(winRate * 15);

  // Trust score contribution (max 10pts)
  const trustContrib = Math.round((trustScore / 100) * 10);

  return goalScore + assistScore + matchScore + winScore + trustContrib;
};

// Calculate rating for ALL players and update Firestore
export const recalculateAllRatings = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (players.length === 0) return;

    // Calculate raw scores
    const scores = players.map(p => ({
      id: p.id,
      rawScore: calculateRawScore(p),
    }));

    const rawScores = scores.map(s => s.rawScore);
    const maxRaw = Math.max(...rawScores);
    const minRaw = Math.min(...rawScores);
    const range = maxRaw - minRaw || 1;

    // Normalize to 0-100 and update each player
    for (const s of scores) {
      const normalized = Math.round(((s.rawScore - minRaw) / range) * 100);
      const finalRating = Math.max(1, Math.min(100, normalized));
      await updateDoc(doc(db, 'users', s.id), {
        skillRating: finalRating,
      });
    }

    console.log('Ratings recalculated for', players.length, 'players');
  } catch (e) {
    console.error('Rating calculation error:', e);
  }
};

// Calculate and update rating for a single player
export const updatePlayerRating = async (userId: string): Promise<void> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return;

    const player = userDoc.data();

    // Get all players to normalize against
    const snap = await getDocs(collection(db, 'users'));
    const allPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const allScores = allPlayers.map(p => calculateRawScore(p));
    const maxRaw = Math.max(...allScores);
    const minRaw = Math.min(...allScores);
    const range = maxRaw - minRaw || 1;

    const myRaw = calculateRawScore(player);
    const normalized = Math.round(((myRaw - minRaw) / range) * 100);
    const finalRating = Math.max(1, Math.min(100, normalized));

    await updateDoc(doc(db, 'users', userId), {
      skillRating: finalRating,
    });

    console.log(`Player ${userId} rating updated to ${finalRating}`);
  } catch (e) {
    console.error('Single player rating error:', e);
  }
};