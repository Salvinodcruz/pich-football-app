import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      router.push({
        pathname: '/profile-setup',
        params: {
          userId: userCredential.user.uid,
          email: userCredential.user.email,
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
        },
      });
    } catch (error: any) {
      let message = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') message = 'This email is already registered';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      else if (error.code === 'auth/weak-password') message = 'Password is too weak';
      Alert.alert('Signup Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="First Name *"
              placeholderTextColor={Colors.dark.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Last Name *"
              placeholderTextColor={Colors.dark.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
              autoCapitalize="words"
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Middle Name (optional)"
            placeholderTextColor={Colors.dark.textSecondary}
            value={middleName}
            onChangeText={setMiddleName}
            editable={!loading}
            autoCapitalize="words"
          />

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

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.dark.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={Colors.dark.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={Colors.dark.background} />
              : <Text style={styles.buttonText}>Create Account</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg },
  logoContainer: { alignItems: 'center', marginTop: 40, marginBottom: Spacing.lg },
  logo: { width: 100, height: 100 },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.dark.textSecondary },
  form: { gap: Spacing.md },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  nameInput: { flex: 1 },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.dark.text,
  },
  button: { backgroundColor: Colors.dark.tint, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.dark.background, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  link: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
});