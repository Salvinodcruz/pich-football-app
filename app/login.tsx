import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      let message = 'Failed to sign in';
      if (error.code === 'auth/invalid-credential') message = 'Invalid email or password';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Try again later';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/pich images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>Pich</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Form */}
        <View style={styles.form}>
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

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.loginBtnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')} disabled={loading}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: Colors.dark.tint,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 90, height: 90 },
  appName: { fontSize: 36, fontWeight: FontWeights.bold, color: Colors.dark.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.dark.textSecondary, marginBottom: Spacing.xl },
  form: { width: '100%', gap: Spacing.md },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.dark.text,
    width: '100%',
  },
  loginBtn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 50,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#000', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
  link: { color: Colors.dark.tint, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  backBtn: { marginTop: Spacing.lg },
  backText: { color: Colors.dark.textSecondary, fontSize: FontSizes.sm },
});