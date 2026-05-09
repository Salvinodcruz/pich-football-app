import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import ChevronBackground from '@/src/components/ChevronBackground';

export default function MatchMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venue, name } = useLocalSearchParams<{ venue: string; name: string }>();

  const openInMaps = () => {
    const query = encodeURIComponent((name || venue) + ' UAE');
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url);
  };

  const openInGoogleMaps = () => {
    const query = encodeURIComponent((name || venue) + ' UAE');
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ChevronBackground />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Venue Location</Text>
          <View style={{ width: 50 }} />
        </View>

      <View style={styles.venueCard}>
        <Text style={styles.venueIcon}>📍</Text>
        <Text style={styles.venueName}>{name || venue}</Text>
        <Text style={styles.venueSubtext}>UAE</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>Open in Maps to see exact location</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
          <Text style={styles.mapsBtnText}>
            {Platform.OS === 'ios' ? '🍎 Open in Apple Maps' : '🗺️ Open in Maps'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.googleBtn} onPress={openInGoogleMaps}>
          <Text style={styles.googleBtnText}>🌐 Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background, padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  backText: { color: Colors.dark.tint, fontSize: FontSizes.md },
  title: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  venueCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.sm },
  venueIcon: { fontSize: 40 },
  venueName: { color: Colors.dark.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, textAlign: 'center' },
  venueSubtext: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  mapPlaceholder: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.md },
  mapIcon: { fontSize: 64 },
  mapText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  actions: { gap: Spacing.sm },
  mapsBtn: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  mapsBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  googleBtn: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  googleBtnText: { color: Colors.dark.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});