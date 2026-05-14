import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';

const { height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if profile exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          router.replace('/(tabs)');
        } else {
          // If no profile, they might have quit during signup
          router.replace('/signup');
        }
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    return unsubscribe;
  }, [fadeAnim, slideAnim, router]);

  return (
    <View style={styles.container}>
      <PremiumBackground />
      {/* Top Section — Logo + Text */}
      <Animated.View
        style={[
          styles.topSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/pich images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* App Name */}
        <Text style={styles.appName}>Pich</Text>
        <Text style={styles.tagline}>UAE football matchmaking app</Text>

        {/* Emirates & Formats */}
        <Text style={styles.subInfo}>Sharjah · Dubai · Ajman</Text>
        <Text style={styles.subInfo}>5-a-side · 7-a-side · 11-a-side</Text>
      </Animated.View>

      {/* Bottom Section — Buttons */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
            paddingBottom: insets.bottom + Spacing.xl,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.signupBtn}
          onPress={() => router.push('/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.signupBtnText}>Create an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: Colors.dark.tint,
    marginBottom: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
  },
  appName: {
    fontSize: 42,
    fontWeight: FontWeights.bold,
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSizes.md,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  subInfo: {
    fontSize: FontSizes.sm,
    color: Colors.dark.textSecondary,
    opacity: 0.6,
  },
  bottomSection: {
    width: '100%',
    gap: Spacing.md,
    paddingTop: Spacing.xl,
  },
  signupBtn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 50,
    padding: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  signupBtnText: {
    color: '#000',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  loginBtn: {
    backgroundColor: Colors.dark.card,
    borderRadius: 50,
    padding: Spacing.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  loginBtnText: {
    color: Colors.dark.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});