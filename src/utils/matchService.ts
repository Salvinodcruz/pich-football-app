import { doc, updateDoc, getDoc, collection, addDoc, getDocs, query, where, writeBatch, increment, runTransaction } from 'firebase/firestore';
import { db, auth } from '@/src/config/firebase';

const sendNotification = async (toUserId: string, data: any) => {
  await addDoc(collection(db, 'notifications'), {
    toUserId,
    status: 'pending',
    read: false,
    createdAt: new Date().toISOString(),
    ...data,
  });
};

export const parseMatchDateTime = (dateStr: string, timeStr: string): Date | null => {
  try {
    const MONTHS: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    let cleanDate = dateStr.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
    const dateParts = cleanDate.split(' ');
    const day = parseInt(dateParts[0]);
    const monthStr = dateParts[1]?.toLowerCase().substring(0, 3);
    const year = parseInt(dateParts[2]) || new Date().getFullYear();
    const month = MONTHS[monthStr];
    
    let hours = 0, minutes = 0;
    if (timeStr) {
      const timeClean = timeStr.trim();
      const [hPart, mPart] = timeClean.split(':');
      hours = parseInt(hPart);
      minutes = parseInt(mPart);
      const isPM = timeClean.toUpperCase().includes('PM');
      const isAM = timeClean.toUpperCase().includes('AM');
      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day, hours, minutes, 0);
    }
  } catch (e) {
    console.log('Date parse failed:', e);
  }
  return null;
};

export const requestCancelMatch = async (
  challengeId: string,
  requestingTeamId: string,
  requestingTeamName: string
): Promise<void> => {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) throw new Error('Match not found');
  const data = challengeDoc.data();

  const matchDate = parseMatchDateTime(data.date, data.time);
  let hoursUntilMatch = 999;
  if (matchDate) {
    hoursUntilMatch = (matchDate.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  // Get other team's captain
  const otherTeamId = data.fromTeamId === requestingTeamId ? data.toTeamId : data.fromTeamId;
  const otherTeamDoc = await getDoc(doc(db, 'teams', otherTeamId));
  const otherCaptainId = otherTeamDoc.data()?.captainId;
  const requestingTeamDoc = await getDoc(doc(db, 'teams', requestingTeamId));
  const requestingCaptainId = requestingTeamDoc.data()?.captainId;

  if (hoursUntilMatch > 24) {
    // Cancel directly
    await updateDoc(doc(db, 'challenges', challengeId), {
      status: 'cancelled',
      cancelledBy: requestingTeamId,
      cancelledAt: new Date().toISOString(),
    });

    // Notify other team captain
    if (otherCaptainId) {
      await sendNotification(otherCaptainId, {
        type: 'match_cancelled',
        opponentTeamName: requestingTeamName,
        matchDate: data.date,
        matchTime: data.time,
        challengeId,
        cancelledBy: requestingTeamId,
      });
    }
  } else {
    const existingRequest = data.cancelRequest;
    if (existingRequest && existingRequest.teamId !== requestingTeamId) {
      // Mutual cancel
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'cancelled',
        cancelledBy: 'mutual',
        cancelledAt: new Date().toISOString(),
      });

      // Notify both captains
      if (otherCaptainId) {
        await sendNotification(otherCaptainId, {
          type: 'match_cancelled',
          opponentTeamName: requestingTeamName,
          matchDate: data.date,
          matchTime: data.time,
          challengeId,
          cancelledBy: 'mutual',
        });
      }
      if (requestingCaptainId) {
        await sendNotification(requestingCaptainId, {
          type: 'match_cancelled',
          opponentTeamName: otherTeamDoc.data()?.name || 'Opponent',
          matchDate: data.date,
          matchTime: data.time,
          challengeId,
          cancelledBy: 'mutual',
        });
      }
    } else {
      // First cancel request within 24hrs
      await updateDoc(doc(db, 'challenges', challengeId), {
        cancelRequest: {
          teamId: requestingTeamId,
          teamName: requestingTeamName,
          requestedAt: new Date().toISOString(),
        }
      });

      // Notify other captain
      if (otherCaptainId) {
        await sendNotification(otherCaptainId, {
          type: 'cancel_request',
          fromTeamId: requestingTeamId,
          fromTeamName: requestingTeamName,
          matchDate: data.date,
          matchTime: data.time,
          challengeId,
        });
      }
    }
  }
};

export const notifyChallengeAccepted = async (challengeId: string) => {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) return;
  const data = challengeDoc.data();

  const fromTeamDoc = await getDoc(doc(db, 'teams', data.fromTeamId));
  const fromCaptainId = fromTeamDoc.data()?.captainId;

  if (fromCaptainId) {
    await sendNotification(fromCaptainId, {
      type: 'challenge_accepted',
      fromTeamName: data.toTeamName,
      matchDate: data.date,
      matchTime: data.time,
      challengeId,
    });
  }
};

export const checkScoreDeadline = async (challengeId: string): Promise<void> => {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) return;
  const data = challengeDoc.data();
  if (data.status !== 'accepted') return;

  try {
    const matchDate = parseMatchDateTime(data.date, data.time);
    if (!matchDate) return;

    const hoursSinceMatch = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60);
    
    // If match was more than 24 hours ago and no final score is set
    if (hoursSinceMatch >= 24 && !data.finalScore) {
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'completed',
        finalScore: { home: 0, away: 0 },
        scoredBy: 'auto_deadline',
        completedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('checkScoreDeadline error:', e);
  }
};

export const sendScoreReminders = async (teamId: string): Promise<void> => {
  try {
    const [q1, q2] = await Promise.all([
      getDocs(query(collection(db, 'challenges'), where('fromTeamId', '==', teamId), where('status', '==', 'accepted'))),
      getDocs(query(collection(db, 'challenges'), where('toTeamId', '==', teamId), where('status', '==', 'accepted'))),
    ]);
    
    const now = Date.now();

    for (const m of [...q1.docs, ...q2.docs]) {
      const data = m.data();
      const matchId = m.id;
      
      // Check if this captain already submitted
      const isHome = data.fromTeamId === teamId;
      const alreadySubmitted = isHome ? !!data.homeScoreSubmitted : !!data.awayScoreSubmitted;
      if (alreadySubmitted) continue;

      // Parse match time
      try {
        const matchDate = parseMatchDateTime(data.date, data.time);
        if (!matchDate) continue;
        
        // If match ended > 1 hour ago
        if (now - matchDate.getTime() > 60 * 60 * 1000) {
          // Check if we already sent a reminder recently
          const notifSnap = await getDocs(query(
            collection(db, 'notifications'),
            where('toUserId', '==', auth.currentUser?.uid),
            where('type', '==', 'score_reminder'),
            where('challengeId', '==', matchId)
          ));

          if (notifSnap.empty) {
            const teamDoc = await getDoc(doc(db, 'teams', teamId));
            const captainId = teamDoc.data()?.captainId;
            if (captainId) {
              await addDoc(collection(db, 'notifications'), {
                type: 'score_reminder',
                toUserId: captainId,
                opponentTeamName: isHome ? data.toTeamName : data.fromTeamName,
                matchDate: data.date,
                matchTime: data.time,
                challengeId: matchId,
                status: 'pending',
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (e) {
        console.error('Reminder parse error:', e);
      }
    }
  } catch (e) {
    console.error('sendScoreReminders error:', e);
  }
};

export const submitMatchResult = async (
  challengeId: string,
  myTeamId: string,
  isHome: boolean,
  score: { home: number; away: number },
  playerStats: any[],
  matchData: any // Still accepting matchData but will refetch inside transaction
) => {
  return await runTransaction(db, async (transaction) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    const challengeSnap = await transaction.get(challengeRef);
    if (!challengeSnap.exists()) throw new Error('Challenge not found');
    const data = challengeSnap.data();

    const field = isHome ? 'homeScoreSubmitted' : 'awayScoreSubmitted';
    const otherField = isHome ? 'awayScoreSubmitted' : 'homeScoreSubmitted';

    // 1. Save current submission
    transaction.update(challengeRef, {
      [field]: score,
      [`${field}PlayerStats`]: playerStats,
    });

    // 2. Check if other team already submitted
    if (data[otherField]) {
      const other = data[otherField];
      
      if (other.home === score.home && other.away === score.away) {
        // SUCCESS: Scores match
        transaction.update(challengeRef, {
          status: 'completed',
          finalScore: score,
          completedAt: new Date().toISOString(),
          resultExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        // Update Team Stats
        const fromTeamRef = doc(db, 'teams', data.fromTeamId);
        const toTeamRef = doc(db, 'teams', data.toTeamId);
        const [fromSnap, toSnap] = await Promise.all([
          transaction.get(fromTeamRef),
          transaction.get(toTeamRef)
        ]);
        
        if (fromSnap.exists() && toSnap.exists()) {
          const fromData = fromSnap.data();
          const toData = toSnap.data();

          if (score.home > score.away) {
            transaction.update(fromTeamRef, { wins: increment(1) });
            transaction.update(toTeamRef, { losses: increment(1) });
          } else if (score.away > score.home) {
            transaction.update(fromTeamRef, { losses: increment(1) });
            transaction.update(toTeamRef, { wins: increment(1) });
          } else {
            transaction.update(fromTeamRef, { draws: increment(1) });
            transaction.update(toTeamRef, { draws: increment(1) });
          }

          // Increment match count only for players who participated
          const myStats = playerStats;
          const otherStats = data[`${otherField}PlayerStats`] || [];
          
          for (const s of [...myStats, ...otherStats]) {
            const userRef = doc(db, 'users', s.playerId);
            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
              const updates: any = { matches: increment(1) };
              if (s.goals > 0) updates.goals = increment(s.goals);
              if (s.assists > 0) updates.assists = increment(s.assists);
              if (s.isGK) {
                if (s.saves > 0) updates.totalSaves = increment(s.saves);
                if (s.cleanSheet) updates.totalCleanSheets = increment(1);
              }
              transaction.update(userRef, updates);
            }
          }
        }

        return { status: 'confirmed' };
      } else {
        // DISPUTE
        transaction.update(challengeRef, { status: 'disputed' });
        return { status: 'disputed' };
      }
    }

    return { status: 'submitted' };
  });
};
