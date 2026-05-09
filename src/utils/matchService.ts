import { doc, updateDoc, getDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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

export const requestCancelMatch = async (
  challengeId: string,
  requestingTeamId: string,
  requestingTeamName: string
): Promise<void> => {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) throw new Error('Match not found');
  const data = challengeDoc.data();

  let hoursUntilMatch = 999;
  try {
    const MONTHS: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    let cleanDate = data.date.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
    const dateParts = cleanDate.split(' ');
    const day = parseInt(dateParts[0]);
    const monthStr = dateParts[1]?.toLowerCase().substring(0, 3);
    const year = parseInt(dateParts[2]) || new Date().getFullYear();
    const month = MONTHS[monthStr];
    let hours = 0, minutes = 0;
    if (data.time) {
      const timeClean = data.time.trim();
      const timeParts = timeClean.split(':');
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      const isPM = timeClean.toUpperCase().includes('PM');
      const isAM = timeClean.toUpperCase().includes('AM');
      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      const matchDate = new Date(year, month, day, hours, minutes, 0);
      hoursUntilMatch = (matchDate.getTime() - Date.now()) / (1000 * 60 * 60);
    }
  } catch (e) {
    console.log('Date parse failed:', e);
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

export const sendScoreReminders = async (teamId: string): Promise<void> => {
  try {
    const [q1, q2] = await Promise.all([
      getDocs(query(collection(db, 'challenges'), where('fromTeamId', '==', teamId), where('status', '==', 'accepted'))),
      getDocs(query(collection(db, 'challenges'), where('toTeamId', '==', teamId), where('status', '==', 'accepted'))),
    ]);
    
    const now = Date.now();
    const MONTHS: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    for (const m of [...q1.docs, ...q2.docs]) {
      const data = m.data();
      const matchId = m.id;
      
      // Check if this captain already submitted
      const isHome = data.fromTeamId === teamId;
      const alreadySubmitted = isHome ? !!data.homeScoreSubmitted : !!data.awayScoreSubmitted;
      if (alreadySubmitted) continue;

      // Parse match time
      try {
        let cleanDate = data.date.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
        const dateParts = cleanDate.split(' ');
        const day = parseInt(dateParts[0]);
        const monthStr = dateParts[1]?.toLowerCase().substring(0, 3);
        const year = parseInt(dateParts[2]) || new Date().getFullYear();
        const month = MONTHS[monthStr];
        let hours = 0, minutes = 0;
        if (data.time) {
          const timeClean = data.time.trim();
          const timeParts = timeClean.split(':');
          hours = parseInt(timeParts[0]);
          minutes = parseInt(timeParts[1]);
          const isPM = timeClean.toUpperCase().includes('PM');
          if (isPM && hours !== 12) hours += 12;
        }
        
        if (isNaN(day) || month === undefined) continue;
        const matchDate = new Date(year, month, day, hours, minutes, 0);
        
        // If match ended > 1 hour ago
        if (now - matchDate.getTime() > 60 * 60 * 1000) {
          // Check if we already sent a reminder recently (e.g., in the last 24h)
          // For simplicity, we'll just check if a reminder notification exists for this match
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

export const checkScoreDeadline = async (challengeId: string): Promise<void> => {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) return;
  const data = challengeDoc.data();
  if (data.status !== 'accepted') return;
  try {
    const MONTHS: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    let cleanDate = data.date.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
    const dateParts = cleanDate.split(' ');
    const day = parseInt(dateParts[0]);
    const monthStr = dateParts[1]?.toLowerCase().substring(0, 3);
    const year = parseInt(dateParts[2]) || new Date().getFullYear();
    const month = MONTHS[monthStr];
    let hours = 0, minutes = 0;
    if (data.time) {
      const timeClean = data.time.trim();
      const timeParts = timeClean.split(':');
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      const isPM = timeClean.toUpperCase().includes('PM');
      if (isPM && hours !== 12) hours += 12;
    }
    if (isNaN(day) || month === undefined) return;
    const matchDate = new Date(year, month, day, hours, minutes, 0);
    const hoursSinceMatch = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60);
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