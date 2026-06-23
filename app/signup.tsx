import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import PremiumBackground from '@/src/components/PremiumBackground';
import { Ionicons } from '@expo/vector-icons';
import { useDialog } from '@/src/context/DialogContext';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          router.replace('/(tabs)');
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Error', 'Please enter your first and last name');
      return;
    }
    if (!email || !password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let user;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      user = userCredential.user;

      if (user) {
        router.push({
          pathname: '/profile-setup',
          params: {
            userId: user.uid,
            email: user.email || email.trim().toLowerCase(),
            firstName: firstName.trim(),
            middleName: middleName.trim(),
            lastName: lastName.trim(),
          },
        });
      }
    } catch (error: any) {
      let message = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') message = 'This email is already registered. Try signing in or use a different email.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      else if (error.code === 'auth/weak-password') message = 'Password is too weak';
      else if (error.code === 'auth/network-request-failed') message = 'Network error. Please check your connection.';
      showAlert('Signup Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <PremiumBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[styles.scrollContent, {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/pich images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Pich and find your team</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name *"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name *"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Middle Name (optional)"
                placeholderTextColor={Colors.dark.textSecondary}
                value={middleName}
                onChangeText={setMiddleName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.dark.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.dark.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.dark.textSecondary} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.dark.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.buttonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#000" />
                  </View>
              }
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
              <Ionicons name="arrow-back" size={16} color={Colors.dark.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  logoContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  logo: { width: 90, height: 90 },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.dark.textSecondary },
  form: { gap: Spacing.md },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.dark.text,
  },
  button: { 
    backgroundColor: Colors.dark.tint, 
    borderRadius: 50, 
    padding: Spacing.md, 
    alignItems: 'center', 
    marginTop: Spacing.sm 
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  link: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  backBtn: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  backText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
});