import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroMatchCardProps {
  match: any;
  onPress: () => void;
}

export default function HeroMatchCard({ match, onPress }: HeroMatchCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateCountdown(match.date, match.time));
    }, 1000);
    return () => clearInterval(timer);
  }, [match]);

  const calculateCountdown = (dateStr: string, timeStr: string) => {
    try {
      const MONTHS: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      let cleanDate = dateStr.replace(/^[a-zA-Z]+\s*,\s*/i, '').trim();
      const parts = cleanDate.split(' ');
      const day = parseInt(parts[0]);
      const month = MONTHS[parts[1]?.toLowerCase().substring(0, 3)];
      const year = parseInt(parts[2]) || new Date().getFullYear();
      
      let hours = 0, minutes = 0;
      if (timeStr) {
        const timeParts = timeStr.trim().split(':');
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
        if (timeStr.toUpperCase().includes('PM') && hours !== 12) hours += 12;
        if (timeStr.toUpperCase().includes('AM') && hours === 12) hours = 0;
      }

      const matchDate = new Date(year, month, day, hours, minutes);
      const diff = matchDate.getTime() - Date.now();

      if (diff <= 0) return 'MATCH STARTED';

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      return `${h}h ${m}m ${s}s`;
    } catch { return '--:--:--'; }
  };

  const isCancelled = match.status === 'cancelled';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      {/* Glossy Background Effect */}
      <View style={styles.glassBg}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M 0 0 L ${SCREEN_WIDTH - 32} 0 L ${SCREEN_WIDTH - 32} 180 L 0 180 Z`}
            fill="url(#glassGrad)"
          />
        </Svg>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.liveBadge, isCancelled && styles.cancelledBadge]}>
            <View style={[styles.liveDot, isCancelled && styles.cancelledDot]} />
            <Text style={[styles.liveText, isCancelled && styles.cancelledText]}>
              {isCancelled ? 'CANCELLED' : 'NEXT MATCH'}
            </Text>
          </View>
          {!isCancelled && <Text style={styles.countdown}>{timeLeft}</Text>}
        </View>

        <View style={styles.matchRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.teamBadge, { backgroundColor: match.fromTeamColor || Colors.dark.tint }]}>
              <Text style={styles.badgeText}>{match.fromTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.teamName} numberOfLines={1}>{match.fromTeamName}</Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{match.format}</Text>
            </View>
          </View>

          <View style={styles.teamInfo}>
            <View style={[styles.teamBadge, { backgroundColor: match.toTeamColor || '#FF6B6B' }]}>
              <Text style={styles.badgeText}>{match.toTeamName?.substring(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.teamName} numberOfLines={1}>{match.toTeamName}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={styles.footerText} numberOfLines={1}>{match.venue}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={styles.footerText}>{match.time}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 4,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
    marginRight: 6,
  },
  liveText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelledBadge: {
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderColor: 'rgba(255,68,68,0.3)',
  },
  cancelledDot: {
    backgroundColor: '#FF4444',
  },
  cancelledText: {
    color: '#FF4444',
  },
  countdown: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  teamInfo: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  teamBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  badgeText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18,
  },
  teamName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    gap: 4,
  },
  vsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: '900',
  },
  formatBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
});
