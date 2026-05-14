import {
  collection, getDocs, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { db } from '@/src/config/firebase';

// Calculate raw score for a single player
// Max possible raw score is 70
export const calculateRawScore = (player: any): number => {
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const matches = player.matches || player.matchesPlayed || 0;
  const wins = player.wins || 0;
  const trustScore = player.trustScore || 100;
  
  const isGK = player.position === 'GK' || player.teamPosition === 'GK';

  let performanceScore = 0;

  if (isGK) {
    // GK Stats (max 35pts total for performance)
    const saves = player.totalSaves || 0;
    const cleanSheets = player.totalCleanSheets || 0;
    
    const saveScore = Math.min(saves * 0.5, 20); // 1pt per 2 saves, max 20
    const csScore = Math.min(cleanSheets * 5, 15); // 5pts per clean sheet, max 15
    performanceScore = saveScore + csScore;
  } else {
    // Outfield Stats (max 35pts total for performance)
    const goalScore = Math.min(goals * 3, 20); // 3pts per goal, max 20
    const assistScore = Math.min(assists * 2, 15); // 2pts per assist, max 15
    performanceScore = goalScore + assistScore;
  }

  // Matches contribution (max 10pts)
  const matchScore = Math.min(matches * 1, 10);

  // Win rate contribution (max 15pts)
  const winRate = matches > 0 ? (wins / matches) : 0;
  const winScore = Math.round(winRate * 15);

  // Trust score contribution (max 10pts)
  const trustContrib = Math.round((trustScore / 100) * 10);

  return performanceScore + matchScore + winScore + trustContrib;
};

// Normalized score 0-100 based on max possible raw score (70)
const normalizeRating = (rawScore: number): number => {
  const normalized = Math.round((rawScore / 70) * 100);
  return Math.max(1, Math.min(100, normalized));
};

// Calculate rating for ALL players and update Firestore
export const recalculateAllRatings = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) return;

    for (const d of snap.docs) {
      const player = d.data();
      const raw = calculateRawScore(player);
      const rating = normalizeRating(raw);
      
      if (player.skillRating !== rating) {
        await updateDoc(doc(db, 'users', d.id), { skillRating: rating });
      }
    }

    console.log('Ratings recalculated for', snap.docs.length, 'players');
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
    const raw = calculateRawScore(player);
    const rating = normalizeRating(raw);

    if (player.skillRating !== rating) {
      await updateDoc(doc(db, 'users', userId), { skillRating: rating });
    }

    console.log(`Player ${userId} rating updated to ${rating}`);
  } catch (e) {
    console.error('Single player rating error:', e);
  }
};
